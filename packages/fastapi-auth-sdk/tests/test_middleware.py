from __future__ import annotations

import asyncio
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from saas_fastapi_auth import SaasAuthConfig, SaasAuthMiddleware, SaasAuthServiceError, SaasUser


class FakeAuthorizer:
    def __init__(self, roles=("developer",), error=None):
        self.roles = roles
        self.error = error
        self.tokens = []

    async def authorize(self, token):
        self.tokens.append(token)
        if self.error:
            raise self.error
        return SaasUser("demo", "Demo User", "demo"), self.roles


async def call_app(middleware, headers=(), path="/data", scope_type="http"):
    messages = []
    captured = {}

    async def app(scope, receive, send):
        captured.update(scope.get("state", {}))
        await send({"type": "http.response.start", "status": 204, "headers": []})
        await send({"type": "http.response.body", "body": b""})

    middleware.app = app
    scope = {"type": scope_type, "path": path, "headers": list(headers)}

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message):
        messages.append(message)

    await middleware(scope, receive, send)
    return messages, captured


class MiddlewareTests(unittest.IsolatedAsyncioTestCase):
    def config(self, **kwargs):
        return SaasAuthConfig("https://auth.example", "launchpad", **kwargs)

    async def test_header_auth_populates_request_state(self):
        authorizer = FakeAuthorizer()
        middleware = SaasAuthMiddleware(lambda *_: None, self.config(), authorizer)
        messages, state = await call_app(middleware, [(b"authorization", b"Bearer opaque")])
        self.assertEqual(messages[0]["status"], 204)
        self.assertEqual(authorizer.tokens, ["opaque"])
        self.assertEqual(state["saas_user"].id, "demo")
        self.assertEqual(state["saas_roles"], ("developer",))

    async def test_cookie_source_and_required_role(self):
        authorizer = FakeAuthorizer(("viewer",))
        middleware = SaasAuthMiddleware(
            lambda *_: None,
            self.config(required_roles=frozenset({"admin"})),
            authorizer,
        )
        messages, _ = await call_app(middleware, [(b"cookie", b"dsp-token=opaque")])
        self.assertEqual(messages[0]["status"], 403)

    async def test_auth_service_outage_fails_closed(self):
        authorizer = FakeAuthorizer(error=SaasAuthServiceError("unavailable", "down"))
        middleware = SaasAuthMiddleware(lambda *_: None, self.config(), authorizer)
        messages, _ = await call_app(middleware, [(b"authorization", b"Bearer opaque")])
        self.assertEqual(messages[0]["status"], 503)
        self.assertEqual(json.loads(messages[1]["body"]), {"error": "saas_auth_unavailable"})

    async def test_health_and_websocket_bypass_http_middleware(self):
        authorizer = FakeAuthorizer(error=AssertionError("must not authorize"))
        middleware = SaasAuthMiddleware(lambda *_: None, self.config(), authorizer)
        health, _ = await call_app(middleware, path="/api/saas/health")
        websocket, _ = await call_app(middleware, scope_type="websocket")
        self.assertEqual(health[0]["status"], 204)
        self.assertEqual(websocket[0]["status"], 204)


if __name__ == "__main__":
    unittest.main()
