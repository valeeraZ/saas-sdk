# SAAS FastAPI Auth SDK

`saas-fastapi-auth` is an ASGI middleware package for FastAPI backends. It
accepts DSP opaque tokens from `Authorization: Bearer` or the configured Cookie,
resolves the current user and authorization-only `/permissions` response, and
fails closed when Auth Service is unavailable.

```python
from fastapi import FastAPI
from saas_fastapi_auth import SaasAuthConfig, SaasAuthMiddleware

app = FastAPI()
app.add_middleware(
    SaasAuthMiddleware,
    config=SaasAuthConfig(
        auth_service_origin="https://auth.internal.example",
        app_name="launchpad",
        required_roles=frozenset({"developer", "release-manager"}),
    ),
)
```

Authenticated requests expose `request.state.saas_user` and
`request.state.saas_roles`. The health endpoint is excluded by default.
WebSocket authentication remains App-specific; do not put the DSP token in a
WebSocket URL.
