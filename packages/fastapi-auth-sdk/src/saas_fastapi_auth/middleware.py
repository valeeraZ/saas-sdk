from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from http.cookies import SimpleCookie
from typing import Any, Awaitable, Callable, Mapping, Protocol

import httpx

ASGIApp = Callable[[dict[str, Any], Callable[[], Awaitable[dict[str, Any]]], Callable[[dict[str, Any]], Awaitable[None]]], Awaitable[None]]
APP_NAME_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ROLE_PATTERN = re.compile(r"^[a-z0-9]+(?:[-_:][a-z0-9]+)*$")


@dataclass(frozen=True)
class SaasUser:
    id: str
    display_name: str
    secondary_label: str


@dataclass(frozen=True)
class SaasAuthConfig:
    auth_service_origin: str
    app_name: str
    required_roles: frozenset[str] = frozenset()
    token_cookie_name: str = "dsp-token"
    token_sources: tuple[str, ...] = ("header", "cookie")
    current_user_path: str = "/v1/authorization/current_user"
    permissions_path: str = "/permissions"
    timeout_seconds: float = 2.0
    max_response_bytes: int = 262_144
    excluded_paths: frozenset[str] = frozenset({"/api/saas/health"})

    def __post_init__(self) -> None:
        origin = httpx.URL(self.auth_service_origin)
        if origin.scheme not in ("http", "https") or origin.userinfo or origin.query or origin.fragment:
            raise ValueError("auth_service_origin must be an HTTP(S) origin")
        if origin.path not in ("", "/"):
            raise ValueError("auth_service_origin must not include a path")
        if not APP_NAME_PATTERN.fullmatch(self.app_name):
            raise ValueError("app_name must be lowercase kebab-case")
        if not self.required_roles.issubset({role for role in self.required_roles if ROLE_PATTERN.fullmatch(role)}):
            raise ValueError("required_roles contains an invalid role")
        if not self.token_sources or any(source not in ("header", "cookie") for source in self.token_sources):
            raise ValueError("token_sources may contain only header and cookie")
        if self.timeout_seconds <= 0 or self.max_response_bytes <= 0:
            raise ValueError("timeout and response limit must be positive")
        for path in (self.current_user_path, self.permissions_path, *self.excluded_paths):
            if not path.startswith("/") or path.startswith("//") or "?" in path or "#" in path:
                raise ValueError("SAAS endpoint paths must be absolute paths")


class SaasAuthServiceError(Exception):
    def __init__(self, category: str, message: str) -> None:
        super().__init__(message)
        self.category = category


class SaasAuthorizer(Protocol):
    async def authorize(self, token: str) -> tuple[SaasUser, tuple[str, ...]]: ...


def _read_user(value: Any) -> SaasUser:
    if not isinstance(value, Mapping):
        raise SaasAuthServiceError("invalid_response", "Auth Service current-user response is invalid")
    user_id = value.get("employee_id", value.get("id"))
    display_name = value.get("display_name", value.get("name"))
    email = value.get("email")
    if not isinstance(user_id, str) or not user_id or not isinstance(display_name, str) or not display_name:
        raise SaasAuthServiceError("invalid_response", "Auth Service current-user response is invalid")
    return SaasUser(user_id, display_name, email if isinstance(email, str) and email else user_id)


def _read_roles(value: Any, app_name: str) -> tuple[str, ...]:
    if not isinstance(value, Mapping) or set(value) != {"apps"} or not isinstance(value["apps"], list):
        raise SaasAuthServiceError("invalid_response", "Auth Service permissions response is invalid")
    seen: set[str] = set()
    app_roles: tuple[str, ...] = ()
    for grant in value["apps"]:
        if not isinstance(grant, Mapping) or set(grant) != {"appName", "roles"}:
            raise SaasAuthServiceError("invalid_response", "Auth Service permission grant is invalid")
        candidate = grant["appName"]
        roles = grant["roles"]
        if (
            not isinstance(candidate, str)
            or not APP_NAME_PATTERN.fullmatch(candidate)
            or candidate in seen
            or not isinstance(roles, list)
            or not roles
            or len(set(roles)) != len(roles)
            or any(not isinstance(role, str) or not ROLE_PATTERN.fullmatch(role) for role in roles)
        ):
            raise SaasAuthServiceError("invalid_response", "Auth Service permission grant is invalid")
        seen.add(candidate)
        if candidate == app_name:
            app_roles = tuple(roles)
    return app_roles


class SaasAuthServiceClient:
    def __init__(self, config: SaasAuthConfig, client: httpx.AsyncClient | None = None) -> None:
        self.config = config
        self._client = client

    async def _get_json(self, path: str, token: str) -> Any:
        owns_client = self._client is None
        client = self._client or httpx.AsyncClient(timeout=self.config.timeout_seconds)
        try:
            response = await client.get(
                str(httpx.URL(self.config.auth_service_origin).join(path)),
                headers={"accept": "application/json", "authorization": f"Bearer {token}"},
            )
            if response.status_code in (401, 403):
                raise SaasAuthServiceError("unauthorized", "DSP token is not authorized")
            if response.status_code < 200 or response.status_code >= 300:
                raise SaasAuthServiceError("unavailable", "Auth Service is unavailable")
            if len(response.content) > self.config.max_response_bytes:
                raise SaasAuthServiceError("invalid_response", "Auth Service response is too large")
            if response.headers.get("content-type", "").split(";", 1)[0].lower() != "application/json":
                raise SaasAuthServiceError("invalid_response", "Auth Service response is not JSON")
            try:
                return response.json()
            except json.JSONDecodeError as error:
                raise SaasAuthServiceError("invalid_response", "Auth Service response is malformed") from error
        except httpx.HTTPError as error:
            raise SaasAuthServiceError("unavailable", "Auth Service is unavailable") from error
        finally:
            if owns_client:
                await client.aclose()

    async def authorize(self, token: str) -> tuple[SaasUser, tuple[str, ...]]:
        user_value, permission_value = await asyncio.gather(
            self._get_json(self.config.current_user_path, token),
            self._get_json(self.config.permissions_path, token),
        )
        return _read_user(user_value), _read_roles(permission_value, self.config.app_name)


def _headers(scope: Mapping[str, Any]) -> dict[str, str]:
    return {
        key.decode("latin-1").lower(): value.decode("latin-1")
        for key, value in scope.get("headers", [])
    }


def _read_token(scope: Mapping[str, Any], config: SaasAuthConfig) -> str | None:
    headers = _headers(scope)
    for source in config.token_sources:
        if source == "header":
            authorization = headers.get("authorization", "")
            scheme, separator, value = authorization.partition(" ")
            if separator and scheme.lower() == "bearer" and value:
                return value if len(value) <= 8_192 and not any(ord(char) < 32 for char in value) else None
        if source == "cookie" and "cookie" in headers:
            cookie = SimpleCookie()
            try:
                cookie.load(headers["cookie"])
            except Exception:
                continue
            morsel = cookie.get(config.token_cookie_name)
            if morsel and 0 < len(morsel.value) <= 8_192:
                return morsel.value
    return None


async def _json_response(send: Callable[[dict[str, Any]], Awaitable[None]], status: int, body: Mapping[str, str]) -> None:
    encoded = json.dumps(body, separators=(",", ":")).encode("utf-8")
    await send({
        "type": "http.response.start",
        "status": status,
        "headers": [
            (b"content-type", b"application/json"),
            (b"content-length", str(len(encoded)).encode("ascii")),
            (b"cache-control", b"no-store"),
        ],
    })
    await send({"type": "http.response.body", "body": encoded})


class SaasAuthMiddleware:
    """FastAPI-compatible ASGI middleware for SAAS DSP authorization.

    Authenticated identity and current-App roles are written to
    ``request.state.saas_user`` and ``request.state.saas_roles`` by way of the
    ASGI ``scope['state']`` mapping. WebSocket authentication remains App-owned.
    """

    def __init__(
        self,
        app: ASGIApp,
        config: SaasAuthConfig,
        authorizer: SaasAuthorizer | None = None,
    ) -> None:
        self.app = app
        self.config = config
        self.authorizer = authorizer or SaasAuthServiceClient(config)

    async def __call__(self, scope: dict[str, Any], receive: Callable[[], Awaitable[dict[str, Any]]], send: Callable[[dict[str, Any]], Awaitable[None]]) -> None:
        if scope.get("type") != "http" or scope.get("path") in self.config.excluded_paths:
            await self.app(scope, receive, send)
            return
        token = _read_token(scope, self.config)
        if token is None:
            await _json_response(send, 401, {"error": "saas_auth_required"})
            return
        try:
            user, roles = await self.authorizer.authorize(token)
        except SaasAuthServiceError as error:
            status = 401 if error.category == "unauthorized" else 503
            await _json_response(send, status, {"error": f"saas_auth_{error.category}"})
            return
        if not roles or (self.config.required_roles and self.config.required_roles.isdisjoint(roles)):
            await _json_response(send, 403, {"error": "saas_role_required"})
            return
        state = scope.setdefault("state", {})
        state["saas_user"] = user
        state["saas_roles"] = roles
        await self.app(scope, receive, send)
