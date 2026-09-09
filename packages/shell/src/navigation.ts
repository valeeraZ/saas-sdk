export type SaasNavigationKind =
  | "home"
  | "admin"
  | "settings"
  | "app"
  | "chart"
  | "alpha"
  | "beta"
  | "remote";

export type SaasNavigationItem = Readonly<{
  appName: string | null;
  description: string;
  href: string;
  kind: SaasNavigationKind;
  label: string;
  requiresAdmin?: boolean;
  section: "platform" | "apps";
}>;

type RegistryNavigationApp = Readonly<{
  appName: string;
  name: string;
  description: string;
  logo: string;
  basePath: string;
  active: boolean;
}>;

type PermissionGrant = Readonly<{
  appName: string;
  roles: readonly string[];
}>;

export type StandaloneNavigationApp = Readonly<{
  appName: string;
  name: string;
  description: string;
  logo: string;
  basePath: string;
}>;

export const SAAS_PLATFORM_NAVIGATION: readonly SaasNavigationItem[] = Object.freeze([
  {
    appName: null,
    description: "Your SAAS workspace",
    href: "/",
    kind: "home",
    label: "Home",
    section: "platform",
  },
  {
    appName: null,
    description: "Registry and runtime status",
    href: "/admin",
    kind: "admin",
    label: "Admin",
    requiresAdmin: true,
    section: "platform",
  },
  {
    appName: null,
    description: "Appearance and navigation",
    href: "/settings",
    kind: "settings",
    label: "Settings",
    section: "platform",
  },
]);

const FIXTURE_APP_NAVIGATION: readonly SaasNavigationItem[] = Object.freeze([
  {
    appName: "local-alpha",
    description: "Same-cluster service",
    href: "/alpha",
    kind: "alpha",
    label: "Local Alpha",
    section: "apps",
  },
  {
    appName: "local-beta",
    description: "Same-cluster service",
    href: "/beta",
    kind: "beta",
    label: "Local Beta",
    section: "apps",
  },
  {
    appName: "remote-gamma",
    description: "Remote-cluster ingress",
    href: "/remote",
    kind: "remote",
    label: "Remote Gamma",
    section: "apps",
  },
]);

export const SAAS_NAVIGATION_FIXTURE: readonly SaasNavigationItem[] = Object.freeze([
  ...SAAS_PLATFORM_NAVIGATION,
  ...FIXTURE_APP_NAVIGATION,
]);

const LOGO_KIND: Readonly<Record<string, SaasNavigationKind>> = Object.freeze({
  Boxes: "beta",
  ChartBar: "chart",
  CircleGauge: "alpha",
  Orbit: "remote",
});

export function buildSaasNavigation(
  catalog: readonly RegistryNavigationApp[],
  grants: readonly PermissionGrant[],
): readonly SaasNavigationItem[] {
  const rolesByAppName = new Map(
    grants.map((grant) => [grant.appName, grant.roles] as const),
  );
  const authorizedApps = catalog.flatMap((app): SaasNavigationItem[] => {
    const roles = rolesByAppName.get(app.appName);
    if (!app.active || !roles || roles.length === 0) return [];
    return [
      {
        appName: app.appName,
        description: app.description,
        href: app.basePath,
        kind: LOGO_KIND[app.logo] ?? "app",
        label: app.name,
        section: "apps",
      },
    ];
  });
  return Object.freeze([...SAAS_PLATFORM_NAVIGATION, ...authorizedApps]);
}

export function buildStandaloneNavigation(
  app: StandaloneNavigationApp,
): readonly SaasNavigationItem[] {
  return Object.freeze([
    Object.freeze({
      appName: app.appName,
      description: app.description,
      href: app.basePath,
      kind: LOGO_KIND[app.logo] ?? "app",
      label: app.name,
      section: "apps" as const,
    }),
  ]);
}

export function filterSaasNavigation(
  items: readonly SaasNavigationItem[],
  hiddenApps: readonly string[],
  canAccessAdmin: boolean,
): readonly SaasNavigationItem[] {
  const hidden = new Set(hiddenApps);
  return items.filter((item) => {
    if (item.requiresAdmin && !canAccessAdmin) return false;
    return item.appName === null || !hidden.has(item.appName);
  });
}
