# Shared application discovery navigation

`SaasPlatformShell` renders Applications and More apps platform links, followed by all user-authorized apps. More apps points to the host Portal `/more-apps` page from Portal and every integrated child app. Child apps never fetch the full discovery directory into their authorized sidebar.

The shell obtains all `/api/navigation` pages using the host's same-origin session. It refreshes on mount, focus, the `saas:navigation-refresh` event, and every 15 seconds while the document is visible. Auth failures clear the authorized app list. These display updates do not replace per-request authorization by Portal and the signed SDK context.

Shell 0.2.1 adds EN/ZH More apps messages and preserves compatibility for existing custom message objects. UI 0.1.2 adds registry-sourced checkbox and textarea components exported through the usual `@saas-platform/ui/components/*` paths. Portal and SDK app scaffolds consume the same styles and theme; Admin keeps independent components.

Role definitions and requests belong to Auth. SDK apps receive the approved role keys in verified context and define their business meaning. There are no platform-standard viewer/user/admin roles, and no application role grants access to the platform Admin console.
