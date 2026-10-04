# `__APP_TITLE__` — tenant Next.js application

Install SDK packages from the private delivery channel or reproducible npm tarballs. Configure SAAS_APP_ID, SAAS_DEPLOYMENT_ID, SAAS_PORTAL_ORIGIN, SAAS_PUBLIC_KEY_FILE, SAAS_APP_DATABASE_URL, SAAS_ASSET_VERSION and PORT. Run npm run build and npm start. This custom server adapter is required; bare next start does not verify Portal request assertions.

The same application build serves all tenant paths. A separate app PostgreSQL account owns notes and durable replay IDs. Configure Portal's reviewed target allowlist, PORTAL_NEXT_APP_ORIGINS and PORTAL_APP_ASSETS with this mount/version/origin. Only JS/CSS/font build artifacts are public; pages, public files, image optimization, API and Server Actions require request-bound assertions. Application navigation uses SDK links; cross-application links use full document navigation. Rotate assetVersion for every build; do not recycle a published version.

This is a minimal integration template, not complete production operations. Configure migrations, database access policy, key rotation, egress, lifecycle and rate limits before deployment. Data queries must always scope both app and tenant; server actions recheck application-specific roles.

## Shared UI and language

This application imports `@saas-platform/ui/globals.css` and renders one SDK `SaasShell`. Tailwind v4 scans the compiled SDK components and this application's sources. shadcn components, semantic tokens and fonts match Portal; assets remain inside this application's versioned namespace. Admin's UI is independent.

Text lives in `messages/en.json` and `messages/zh.json`; next-intl resolves language from the verified request presentation, without changing tenant URLs. The SDK normalizes theme, collapsed sidebar and locale after signature verification. Shared controls persist browser preferences; Portal sends them in the next signed request. Preferences are local to the browser, not account synchronized, and never grant authorization.

Use SDK component subpath imports when adding pages, and retain SDK links/fetch plus tenant-scoped queries and action role checks. Do not copy Portal styles, nest another Shell, forward login cookies or trust arbitrary browser identity headers.
