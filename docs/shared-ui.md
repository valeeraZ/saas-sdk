# Shared Portal and child application UI

`@saas-platform/ui` owns shadcn components, Tailwind v4 styles and font declarations. `@saas-platform/theme` owns semantic tokens, browser preference keys and presentation normalization. `@saas-platform/shell` owns navigation, the shared frame, bilingual Shell captions and presentation controls. Admin remains an independent UI consumer with its own components.

Import `@saas-platform/ui/globals.css` in a consumer root layout and configure `@tailwindcss/postcss`. Compiled UI/Shell sources are explicitly scanned; consumer utilities are scanned normally. Manrope and JetBrains Mono are packaged dependencies, not remote font downloads. Prefer direct component subpath imports.

Both scaffold modes consume these packages. The Portal scaffold includes next-intl request configuration and English/Chinese JSON resources. `getSaasShellMessages(locale)` and `SaasPresentationControls` are also available to applications using another translation runtime; the Shell does not require next-intl.

The verified application context contains optional `presentation` for backward compatibility. The adapter defaults missing or invalid values to light theme, expanded sidebar and Chinese. Valid choices are light/dark, a boolean sidebar state and zh/en. Presentation is signed with the existing request-bound assertion, normalized after verification and protected with the existing internal context MAC. It is only display state; role, user, path, method, body and replay checks remain authoritative. Portal session cookies never reach the application.

SSR reads verified presentation so the first document has the correct theme and language. Local SDK preferences share browser cookies/storage at the Portal origin. Cross-device account synchronization is outside this release. Application pages render one Shell and keep native RSC navigation, streaming and Server Actions; cross-application navigation loads a new document.

Deliver the compiled packages through the private channel or `npm run pack`. Portal records its vendored package digests and source revision. `npm run verify` validates declarations and exports from independent installations, both scaffolds, packaged CSS/fonts and existing consumers. Actual Portal UI and authorization regression is exercised by saas-portal's disposable local rollout drill.
