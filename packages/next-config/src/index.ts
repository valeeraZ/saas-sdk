import {
  parseSaasManifest,
  type SaasAppManifest,
} from "@saas-platform/manifest-schema";

export type SaasNextConfig = Readonly<Record<string, unknown>> & {
  readonly basePath?: string;
  readonly output?: string;
  readonly transpilePackages?: readonly string[];
};

const SAAS_TRANSPILE_PACKAGES = [
  "@saas-platform/sdk",
  "@saas-platform/shell",
  "@saas-platform/theme",
  "@saas-platform/ui",
] as const;

export function withSaasNextConfig<T extends SaasNextConfig>(
  manifestInput: SaasAppManifest,
  nextConfig: T = {} as T,
): T & {
  readonly basePath: string;
  readonly output: string;
  readonly transpilePackages: readonly string[];
} {
  const manifest = parseSaasManifest(manifestInput);
  if (
    nextConfig.basePath !== undefined &&
    nextConfig.basePath !== manifest.basePath
  ) {
    throw new Error(
      `Next.js basePath ${nextConfig.basePath} does not match manifest ${manifest.basePath}`,
    );
  }
  if (
    "assetPrefix" in nextConfig &&
    nextConfig.assetPrefix === manifest.basePath
  ) {
    throw new Error(
      "Do not use assetPrefix as a substitute for the SAAS basePath",
    );
  }
  const transpilePackages = [
    ...new Set([
      ...SAAS_TRANSPILE_PACKAGES,
      ...(nextConfig.transpilePackages ?? []),
    ]),
  ];
  return Object.freeze({
    ...nextConfig,
    basePath: manifest.basePath,
    output: nextConfig.output ?? "standalone",
    transpilePackages: Object.freeze(transpilePackages),
  });
}

/** Dynamic tenant paths are application routes, never a runtime Next basePath. */
export function withSaasTenantNextConfig<T extends SaasNextConfig>(
  options: Readonly<{
    mount: string;
    assetVersion: string;
    portalOrigin: string;
  }>,
  nextConfig: T = {} as T,
) {
  if (
    !/^[a-z][a-z0-9-]{0,62}$/.test(options.mount) ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(options.assetVersion)
  )
    throw new Error("Invalid tenant application namespace");
  const portal = new URL(options.portalOrigin);
  if (
    portal.origin !== options.portalOrigin ||
    !["http:", "https:"].includes(portal.protocol)
  )
    throw new Error("Portal must be an HTTP(S) origin");
  const assetPrefix = `/app-assets/${options.mount}/${options.assetVersion}`;
  if (
    nextConfig.basePath ||
    ("assetPrefix" in nextConfig && nextConfig.assetPrefix !== assetPrefix)
  )
    throw new Error("Tenant routing owns basePath and assetPrefix");
  const experimental = (nextConfig.experimental ?? {}) as Record<
    string,
    unknown
  >;
  const actions = (experimental.serverActions ?? {}) as Record<string, unknown>;
  return Object.freeze({
    ...nextConfig,
    basePath: "",
    assetPrefix,
    skipTrailingSlashRedirect: true,
    skipProxyUrlNormalize: true,
    experimental: {
      ...experimental,
      serverActions: {
        ...actions,
        allowedOrigins: [portal.host],
        bodySizeLimit: "8mb",
      },
    },
    // This mode requires the SDK server adapter; standalone generated server omits it.
    output: undefined,
  });
}
