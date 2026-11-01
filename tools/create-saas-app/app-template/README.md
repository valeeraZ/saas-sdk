# `__APP_TITLE__` — Portal application

Run with the SDK's verified `createSaasAppHandler` and configure reviewed Portal origin, app/deployment IDs, public key, app database and a unique asset version. Business requests use `/apps/{mount}/...`; immutable JS/CSS/fonts use `/app-assets/{mount}/{version}/...`. No tenant ID, hidden tenant or Portal login cookie reaches the application server.

The platform owns user identity and app permissions. This sample chooses user-private notes scoped by app ID and verified user ID; each application decides its own private/shared data policy. It never trusts browser-submitted identity fields. Server Actions check app roles and the original request signature/body/replay protections.

`SaasPlatformShell` is shared with Portal, including the same user profile, home entry, complete live user-authorized app navigation, presentation controls and mobile sidebar. It loads all pages of `/api/navigation` through the same-origin Portal session BFF; those cookies are never forwarded to child servers. Cross-app links use full document navigation. UI messages are centralized in `messages/en.json` and `messages/zh.json`, using next-intl and verified presentation preferences.

Configure operator-reviewed deployments/publication and direct user app grants before access. Treat database migration, secrets, egress, key rotation, retention and production HTTPS as deployment configuration. Never recycle a published asset version.
