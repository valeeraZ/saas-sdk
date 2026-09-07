import {
  FramePermissionsClient,
  loadFrameAuthConfig,
  type FrameAuthRequest,
  type FrameCurrentUser,
  type FramePermissions,
} from "@frame/auth";
import type { FrameAppManifest } from "@frame/manifest-schema";
import {
  FramePortalSessionClient,
  loadFramePortalSessionConfig,
  type IntegratedFrameSession,
} from "@frame/shell/integrated-session";
import {
  buildStandaloneNavigation,
  type FrameNavigationItem,
} from "@frame/shell/navigation";

import { loadFrameAppRuntimeConfig } from "./runtime.ts";

export type FrameAppSession = Readonly<{
  mode: "standalone" | "integrated";
  user: Readonly<{ displayName: string; secondaryLabel: string }>;
  navigation: readonly FrameNavigationItem[];
  currentAppRoles: readonly string[];
  canAccessAdmin: boolean;
  homeHref: string;
  preferencesMode: "local" | "portal";
}>;

type AuthClient = Readonly<{
  getCurrentUser(request: FrameAuthRequest): Promise<FrameCurrentUser>;
  get(request: FrameAuthRequest): Promise<FramePermissions>;
}>;

type PortalClient = Readonly<{
  get(request: FrameAuthRequest): Promise<IntegratedFrameSession>;
}>;

export type ResolveFrameAppSessionOptions = Readonly<{
  environment?: Readonly<Record<string, string | undefined>>;
  authClient?: AuthClient;
  portalClient?: PortalClient;
}>;

export async function resolveFrameAppSession(
  request: FrameAuthRequest,
  manifestInput: FrameAppManifest,
  options: ResolveFrameAppSessionOptions = {},
): Promise<FrameAppSession> {
  const environment = options.environment ?? process.env;
  const runtime = loadFrameAppRuntimeConfig(manifestInput, environment);
  const authClient =
    options.authClient ?? new FramePermissionsClient(loadFrameAuthConfig(environment));

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
    new FramePortalSessionClient(loadFramePortalSessionConfig(environment));
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
