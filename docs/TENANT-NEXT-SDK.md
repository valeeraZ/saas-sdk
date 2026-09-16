# Tenant-aware Next.js SDK

Implemented 2026-09-16 as an additive development snapshot of the existing private 0.1.0 packages. Existing fixed-basePath exports and scaffolding remain compatible; these tarballs are not a published release. Use this commit's reproducible `npm run pack` output and generated consumer lockfile, not an unqualified registry package with the same development version.

## Contract

Next.js child applications preserve the full browser path `/tenants/{tenantId}/apps/{mount}/…` upstream. The same build serves multiple tenants. Tenant identity comes from the verified Portal assertion for every page, API, image and Server Action, never a global mutable browser Cookie. The SDK does not change Auth/Admin data ownership.

`@saas-platform/sdk/tenant` exports `tenantBasePath`, `tenantHref`, `tenantFetch`, `tenantImageUrl` and `publicTenantContext`. URLs stay inside the verified application's mount; external URLs, traversal, ambiguous encoded separators and identity header overrides are rejected. Image optimization currently supports only this application's public files.

`@saas-platform/sdk/tenant-react` exports `SaasTenantProvider`, `useSaasTenant`, `SaasTenantLink`, `useSaasTenantRouter` and `SaasApplicationLink`. Use the SDK Link/router for navigation inside one application. Cross-application navigation uses an ordinary document link. Send only the explicitly selected public context to the provider; assertions, Auth tokens and Portal service credentials never become client props.

`@saas-platform/sdk/tenant-server` exports `createSaasTenantHandler` for the application's Node server. It verifies RS256, issuer, app audience, deployment, tenant/base path, user, roles, method, exact upstream path/query, expiration, body SHA-256 and durable one-time jti before executing Next.js. The app supplies a shared database-backed `claimReplay` callback; replay storage must work across replicas. POST bytes are verified and replayed into Next's handler; empty GET/HEAD requests reuse the original Node request to preserve socket lifecycle.

`@saas-platform/sdk/tenant-next` exports async `getSaasTenant()` for Server Components, Route Handlers and Server Actions. The verified Node adapter injects a private HMAC-protected public context header, expiring no later than the original assertion. This survives Next render dispatch/bundling without relying on a shared AsyncLocalStorage instance. The application process generates its internal context key; it must remain server-only. Browser-supplied context headers are replaced, and missing/modified context is rejected. Server code must also check its own business roles and scope all data/cache queries by tenant (and app when relevant).

`withSaasTenantNextConfig` from `@saas-platform/next-config` configures an empty build-time basePath, a distinct build assetPrefix and the exact public Portal host for Server Actions. Do not externalize the entire SDK package: Next must process client component boundaries. Run the SDK Node adapter entry; bare `next start` omits body/replay verification and is unsupported for this mode. Generated standalone servers omit this adapter, so this mode does not enable standalone output.

## Public build assets and private resources

Only immutable JS/CSS/font build files under `/app-assets/{mount}/{assetVersion}/_next/static/…` are public and tenant-independent. Allocate a fresh assetVersion for every published build; never recycle a version. Public assets cannot redirect or set application/Portal Cookies. These paths cannot serve APIs, images, public directories or source maps. Everything under a tenant application prefix still requires Portal live authorization and the app's independent assertion verification.

Portal uses its reviewed `PORTAL_NEXT_APP_ORIGINS` to preserve full paths for Next deployments; existing report-style deployments retain suffix mapping. `PORTAL_APP_ASSETS` is an operator-supplied projection of reviewed build metadata, matched against the existing target allowlist:

```json
[{"mount":"reports","version":"deployment-build-id","origin":"https://reports.internal"}]
```

Portal's protected server entry remains required for Set-Cookie removal and same-tenant HTTP/Server Action redirect enforcement. Asset metadata publication and removal belong to the deployment/operator workflow; this change does not implement automated Registry asset synchronization or public package publishing.

## Generate and reproduce

```sh
create-saas-app --directory ./reports --name reports --title Reports --routing tenant
# Install SDK packages from the private channel or this commit's tarballs.
# Set SAAS_APP_ID, SAAS_DEPLOYMENT_ID, SAAS_PORTAL_ORIGIN,
# SAAS_PUBLIC_KEY_FILE, SAAS_APP_DATABASE_URL, SAAS_ASSET_VERSION and PORT.
npm run build
npm start
```

The template includes dynamic routes, verified context, SDK Link/fetch, a real Server Action with redirect, public files, a bundled local font, image optimization and tenant/app-scoped PostgreSQL notes plus durable replay storage. It is a minimal integration example; production migrations, rollout/key rotation and ingress lifecycle remain service deployment work.

From the SDK checkout:

```sh
npm ci
npm run pack
npm run test:tenant-next
```

This installs the packed scaffold bin into an isolated bootstrap and generates/builds/types-checks **two** independent Next.js 16.3.5 consumers of SDK tarballs, checking their installed package paths cannot escape into the workspace. Their directory and artifact integrities are recorded in ignored `artifacts/tenant-next-consumer.json`. Real Auth/Admin/browser tests live in Portal's `integration/tenant-next.test.ts`; its setup/verification is described in that repository's `docs/TENANT-NEXT-VALIDATION.md`.

Local validation: 42 Node tests and 4 Python tests passed; whole-workspace type checking passed; isolated legacy packed consumer/export/build/basePath checks passed; both new Next consumers built and type-checked. Real Portal/Keycloak/Auth/Admin/PostgreSQL integration passed SSR/streaming, RSC Link/history navigation, hydrated Server Action POST/redirect, SDK fetch, JS/CSS/local font/public/image optimization, two applications, same-build two-tenant notes, anonymous/direct-upstream rejection, forged identity isolation and immediate role revocation. Desktop/mobile QA had no blank page, framework overlay, horizontal overflow or browser error/warning.

This is local verification, not production/HA certification. WebSocket, application Cookies, remote/private-data image sources and automated asset projection are not implemented here. No public npm/PyPI release or deployment occurred.

Official implementation references: [Next.js Multi-Zones](https://nextjs.org/docs/app/guides/multi-zones), [Server Actions allowedOrigins](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions), [Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy).
