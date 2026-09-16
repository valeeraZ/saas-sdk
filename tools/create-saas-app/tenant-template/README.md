# **APP_TITLE** — tenant Next.js application

Install SDK packages from the private delivery channel or reproducible npm tarballs. Configure SAAS_APP_ID, SAAS_DEPLOYMENT_ID, SAAS_PORTAL_ORIGIN, SAAS_PUBLIC_KEY_FILE, SAAS_APP_DATABASE_URL, SAAS_ASSET_VERSION and PORT. Run npm run build and npm start. This custom server adapter is required; bare next start does not verify Portal request assertions.

The same application build serves all tenant paths. A separate app PostgreSQL account owns notes and durable replay IDs. Configure Portal's reviewed target allowlist, PORTAL_NEXT_APP_ORIGINS and PORTAL_APP_ASSETS with this mount/version/origin. Only JS/CSS/font build artifacts are public; pages, public files, image optimization, API and Server Actions require request-bound assertions. Application navigation uses SDK links; cross-application links use full document navigation. Rotate assetVersion for every build; do not recycle a published version.

This is a minimal integration template, not complete production operations. Configure migrations, database access policy, key rotation, egress, lifecycle and rate limits before deployment. Data queries must always scope both app and tenant; server actions recheck application-specific roles.
