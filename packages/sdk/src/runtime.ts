import { loadFrameRuntimeMode, type FrameRuntimeMode } from "@frame/auth";
import {
  parseFrameManifest,
  type FrameAppManifest,
} from "@frame/manifest-schema";

export type FrameAppRuntimeConfig = Readonly<{
  manifest: FrameAppManifest;
  mode: FrameRuntimeMode;
  portalOrigin: string | null;
}>;

export class FrameAppConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrameAppConfigurationError";
  }
}

function parseOrigin(value: string, name: string): string {
  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    throw new FrameAppConfigurationError(`${name} must be a valid URL origin`);
  }
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    (origin.pathname !== "/" && origin.pathname !== "")
  ) {
    throw new FrameAppConfigurationError(`${name} must be an HTTP(S) origin`);
  }
  return origin.origin;
}

export function loadFrameAppRuntimeConfig(
  manifestInput: FrameAppManifest,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): FrameAppRuntimeConfig {
  const manifest = parseFrameManifest(manifestInput);
  const mode = loadFrameRuntimeMode(environment);
  const configuredOrigin = environment.FRAME_PORTAL_ORIGIN;
  if (mode === "integrated" && !configuredOrigin) {
    throw new FrameAppConfigurationError(
      "FRAME_PORTAL_ORIGIN is required in integrated mode",
    );
  }
  return Object.freeze({
    manifest,
    mode,
    portalOrigin: configuredOrigin ? parseOrigin(configuredOrigin, "FRAME_PORTAL_ORIGIN") : null,
  });
}

export function framePublicAsset(
  manifestInput: FrameAppManifest,
  asset: string,
): string {
  const manifest = parseFrameManifest(manifestInput);
  const normalized = asset.startsWith("/") ? asset.slice(1) : asset;
  if (!manifest.publicAssets.includes(normalized)) {
    throw new FrameAppConfigurationError(
      `Public asset ${asset} is not declared in the FRAME manifest`,
    );
  }
  return `${manifest.basePath}/${normalized}`;
}
