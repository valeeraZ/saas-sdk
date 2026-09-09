import {
  SaasPermissionsClient,
  loadSaasAuthConfig,
  type SaasAuthRequest,
  type SaasCurrentUser,
  type SaasPermissions,
} from "@saas-platform/auth";
import type { SaasAppManifest } from "@saas-platform/manifest-schema";
import {
  SaasPortalSessionClient,
  loadSaasPortalSessionConfig,
  type IntegratedSaasSession,
} from "@saas-platform/shell/integrated-session";
import {
  buildStandaloneNavigation,
  type SaasNavigationItem,
} from "@saas-platform/shell/navigation";

import { loadSaasAppRuntimeConfig } from "./runtime.ts";

export type SaasAppSession = Readonly<{
  mode: "standalone" | "integrated";
  user: Readonly<{ displayName: string; secondaryLabel: string }>;
  navigation: readonly SaasNavigationItem[];
  currentAppRoles: readonly string[];
  canAccessAdmin: boolean;
  homeHref: string;
  preferencesMode: "local" | "portal";
}>;

type AuthClient = Readonly<{
  getCurrentUser(request: SaasAuthRequest): Promise<SaasCurrentUser>;
  get(request: SaasAuthRequest): Promise<SaasPermissions>;
}>;

type PortalClient = Readonly<{
  get(request: SaasAuthRequest): Promise<IntegratedSaasSession>;
}>;

export type ResolveSaasAppSessionOptions = Readonly<{
  environment?: Readonly<Record<string, string | undefined>>;
  authClient?: AuthClient;
  portalClient?: PortalClient;
}>;

export async function resolveSaasAppSession(
  request: SaasAuthRequest,
  manifestInput: SaasAppManifest,
  options: ResolveSaasAppSessionOptions = {},
): Promise<SaasAppSession> {
  const environment = options.environment ?? process.env;
  const runtime = loadSaasAppRuntimeConfig(manifestInput, environment);
  const authClient =
    options.authClient ?? new SaasPermissionsClient(loadSaasAuthConfig(environment));

  if (runtime.mode === "standalone") {
    const currentUser = await authClient.getCurrentUser(request);
    return Object.freeze({
      mode: "standalone",
      user: Object.freeze({
        displayName: currentUser.displayName,
        secondaryLabel: currentUser.secondaryLabel,
      }),
      navigation: buildStandaloneNavigation(runtime.manifest),
      currentAppRoles: runtime.manifest.standaloneRoles,
      canAccessAdmin: false,
      homeHref: runtime.manifest.basePath,
      preferencesMode: "local",
    });
  }

  const portalClient =
    options.portalClient ??
    new SaasPortalSessionClient(loadSaasPortalSessionConfig(environment));
  const [portalSession, permissions] = await Promise.all([
    portalClient.get(request),
    authClient.get(request),
  ]);
  const grant = permissions.apps.find((candidate) => candidate.appName === runtime.manifest.appName);
  if (!grant || grant.roles.length === 0) {
    throw new Error(`User is not authorized for ${runtime.manifest.appName}`);
  }
  return Object.freeze({
    mode: "integrated",
    user: portalSession.user,
    navigation: portalSession.navigation,
    currentAppRoles: grant.roles,
    canAccessAdmin: portalSession.canAccessAdmin,
    homeHref: "/",
    preferencesMode: "portal",
  });
}
