import { loadSaasRuntimeMode, type SaasRuntimeMode } from "@saas-platform/auth";
import {
  parseSaasManifest,
  type SaasAppManifest,
} from "@saas-platform/manifest-schema";

export type SaasAppRuntimeConfig = Readonly<{
  manifest: SaasAppManifest;
  mode: SaasRuntimeMode;
  portalOrigin: string | null;
}>;

export class SaasAppConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaasAppConfigurationError";
  }
}

function parseOrigin(value: string, name: string): string {
  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    throw new SaasAppConfigurationError(`${name} must be a valid URL origin`);
  }
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    (origin.pathname !== "/" && origin.pathname !== "")
  ) {
    throw new SaasAppConfigurationError(`${name} must be an HTTP(S) origin`);
  }
  return origin.origin;
}

export function loadSaasAppRuntimeConfig(
  manifestInput: SaasAppManifest,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SaasAppRuntimeConfig {
  const manifest = parseSaasManifest(manifestInput);
  const mode = loadSaasRuntimeMode(environment);
  const configuredOrigin = environment.SAAS_PORTAL_ORIGIN;
  if (mode === "integrated" && !configuredOrigin) {
    throw new SaasAppConfigurationError(
      "SAAS_PORTAL_ORIGIN is required in integrated mode",
    );
  }
  return Object.freeze({
    manifest,
    mode,
    portalOrigin: configuredOrigin ? parseOrigin(configuredOrigin, "SAAS_PORTAL_ORIGIN") : null,
  });
}

export function saasPublicAsset(
  manifestInput: SaasAppManifest,
  asset: string,
): string {
  const manifest = parseSaasManifest(manifestInput);
  const normalized = asset.startsWith("/") ? asset.slice(1) : asset;
  if (!manifest.publicAssets.includes(normalized)) {
    throw new SaasAppConfigurationError(
      `Public asset ${asset} is not declared in the SAAS manifest`,
    );
  }
  return `${manifest.basePath}/${normalized}`;
}
