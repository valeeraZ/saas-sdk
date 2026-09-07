import {
  parseFrameManifest,
  type FrameAppManifest,
} from "@frame/manifest-schema";

export type FrameNextConfig = Readonly<Record<string, unknown>> & {
  readonly basePath?: string;
  readonly output?: string;
  readonly transpilePackages?: readonly string[];
};

const FRAME_TRANSPILE_PACKAGES = [
  "@frame/sdk",
  "@frame/shell",
  "@frame/theme",
  "@frame/ui",
] as const;

export function withFrameNextConfig<T extends FrameNextConfig>(
  manifestInput: FrameAppManifest,
  nextConfig: T = {} as T,
): T & {
  readonly basePath: string;
  readonly output: string;
  readonly transpilePackages: readonly string[];
} {
  const manifest = parseFrameManifest(manifestInput);
  if (nextConfig.basePath !== undefined && nextConfig.basePath !== manifest.basePath) {
    throw new Error(
      `Next.js basePath ${nextConfig.basePath} does not match manifest ${manifest.basePath}`,
    );
  }
  if ("assetPrefix" in nextConfig && nextConfig.assetPrefix === manifest.basePath) {
    throw new Error("Do not use assetPrefix as a substitute for the FRAME basePath");
  }
  const transpilePackages = [
    ...new Set([
      ...FRAME_TRANSPILE_PACKAGES,
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
