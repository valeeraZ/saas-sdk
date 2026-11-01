# User and application platform (SDK 0.2)

This contract replaces the tenant SDK. The platform owns user identity and per-user application grants. Each application chooses how to store and share its own business data. No tenant identifier is accepted in the Portal assertion or public application context.

Use `@saas-platform/sdk/app`, `app-react`, `app-server`, and `app-next`: `appHref`, `appFetch`, `appImageUrl`, `publicAppContext`, `SaasAppProvider`, `SaasAppLink`, `useSaasAppRouter`, `createSaasAppHandler`, and `getSaasApp`. Routes are `/apps/{mount}/…`. `withSaasAppNextConfig` pins the public host and immutable build asset namespace. The Node adapter validates signature, audience, user/profile binding, deployment, method, exact path, body hash, expiration and durable one-time replay before executing Next.js. Run the adapter, not bare `next start`.

`SaasPlatformShell` from `@saas-platform/shell/platform-shell` is shared by Portal and the integrated scaffold. It loads every authorized catalog page from Portal's same-origin `/api/navigation`, including empty filtered pages, and refreshes on focus. Failures clear navigation and expose a translated retry action. Requests use the browser's Portal session; child servers never receive its Cookie. Application links load a new document; internal SDK links preserve native RSC navigation. Profile, theme, language and sidebar preferences share the Portal origin.

Generate with `create-saas-app --directory ./reports --name reports --title Reports --routing portal`. The example notes store uses application and user keys as one sample business policy; the SDK does not prescribe business data isolation. English and Chinese UI use next-intl, shadcn and Tailwind from shared platform packages.

Run `npm run test`, `npm run typecheck`, `npm run pack`, `npm run test:packed`, and `npm run test:app-next`. The last command builds two independent tarball consumers and records `artifacts/app-next-consumer.json`. SDK 0.2 requires the matching Auth, Admin and Portal protocol; old tenant apps must migrate together. Historical documentation describes earlier releases and does not define this contract.
