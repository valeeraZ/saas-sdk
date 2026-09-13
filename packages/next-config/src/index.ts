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
  if (nextConfig.basePath !== undefined && nextConfig.basePath !== manifest.basePath) {
    throw new Error(
      `Next.js basePath ${nextConfig.basePath} does not match manifest ${manifest.basePath}`,
    );
  }
  if ("assetPrefix" in nextConfig && nextConfig.assetPrefix === manifest.basePath) {
    throw new Error("Do not use assetPrefix as a substitute for the SAAS basePath");
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
