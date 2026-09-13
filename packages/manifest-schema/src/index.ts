export const SAAS_MANIFEST_SCHEMA_VERSION = 1 as const;

export type SaasRoleDeclaration = Readonly<{
  name: string;
  description: string;
}>;

export type SaasAppManifest = Readonly<{
  schemaVersion: typeof SAAS_MANIFEST_SCHEMA_VERSION;
  appName: string;
  name: string;
  description: string;
  logo: "Boxes" | "ChartBar" | "CircleGauge" | "Orbit";
  basePath: string;
  healthPath: "/api/saas/health";
  shellVersion: string;
  roles: readonly SaasRoleDeclaration[];
  standaloneRoles: readonly string[];
  publicAssets: readonly string[];
}>;

export class SaasManifestError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid SAAS manifest: ${issues.join("; ")}`);
    this.name = "SaasManifestError";
    this.issues = Object.freeze([...issues]);
  }
}

const APP_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BASE_PATH_PATTERN = /^\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROLE_PATTERN = /^[a-z0-9]+(?:[-_:][a-z0-9]+)*$/;
const SHELL_RANGE_PATTERN = /^(?:\^|~|>=)?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PUBLIC_ASSET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const RESERVED_BASE_PATHS = new Set([
  "/admin",
  "/api",
  "/app-unavailable",
  "/settings",
  "/_next",
]);
const LOGOS = new Set(["Boxes", "ChartBar", "CircleGauge", "Orbit"]);
const MANIFEST_FIELDS = new Set([
  "schemaVersion",
  "appName",
  "name",
  "description",
  "logo",
  "basePath",
  "healthPath",
  "shellVersion",
  "roles",
  "standaloneRoles",
  "publicAssets",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= maxLength;
}

function validatePublicAsset(asset: unknown): asset is string {
  return (
    isNonEmptyString(asset, 240) &&
    PUBLIC_ASSET_PATTERN.test(asset) &&
    !asset.startsWith("/") &&
    !asset.includes("//") &&
    !asset.split("/").includes("..")
  );
}

export function parseSaasManifest(value: unknown): SaasAppManifest {
  const issues: string[] = [];
  if (!isRecord(value)) throw new SaasManifestError(["manifest must be an object"]);

  const unknownFields = Object.keys(value).filter((key) => !MANIFEST_FIELDS.has(key));
  if (unknownFields.length > 0) issues.push(`unknown fields: ${unknownFields.join(", ")}`);
  if (value.schemaVersion !== SAAS_MANIFEST_SCHEMA_VERSION) {
    issues.push(`schemaVersion must be ${SAAS_MANIFEST_SCHEMA_VERSION}`);
  }
  if (!isNonEmptyString(value.appName, 80) || !APP_NAME_PATTERN.test(value.appName)) {
    issues.push("appName must be lowercase kebab-case");
  }
  if (!isNonEmptyString(value.name, 120)) issues.push("name must be 1-120 characters");
  if (!isNonEmptyString(value.description, 500)) {
    issues.push("description must be 1-500 characters");
  }
  if (typeof value.logo !== "string" || !LOGOS.has(value.logo)) {
    issues.push("logo must be an approved SAAS icon");
  }
  if (
    !isNonEmptyString(value.basePath, 100) ||
    !BASE_PATH_PATTERN.test(value.basePath) ||
    RESERVED_BASE_PATHS.has(value.basePath)
  ) {
    issues.push("basePath must be a non-reserved lowercase kebab-case path");
  }
  if (value.healthPath !== "/api/saas/health") {
    issues.push("healthPath must be /api/saas/health");
  }
  if (!isNonEmptyString(value.shellVersion, 40) || !SHELL_RANGE_PATTERN.test(value.shellVersion)) {
    issues.push("shellVersion must be a simple semantic version or range");
  }

  const roleNames = new Set<string>();
  if (!Array.isArray(value.roles) || value.roles.length === 0) {
    issues.push("roles must contain at least one role declaration");
  } else {
    value.roles.forEach((role, index) => {
      if (
        !isRecord(role) ||
        Object.keys(role).some((key) => key !== "name" && key !== "description") ||
        !isNonEmptyString(role.name, 100) ||
        !ROLE_PATTERN.test(role.name) ||
        !isNonEmptyString(role.description, 300) ||
        roleNames.has(role.name)
      ) {
        issues.push(`roles[${index}] is invalid or duplicated`);
        return;
      }
      roleNames.add(role.name);
    });
  }

  if (
    !Array.isArray(value.standaloneRoles) ||
    value.standaloneRoles.length === 0 ||
    value.standaloneRoles.some((role) => typeof role !== "string" || !roleNames.has(role)) ||
    new Set(value.standaloneRoles).size !== value.standaloneRoles.length
  ) {
    issues.push("standaloneRoles must be unique names declared in roles");
  }

  if (
    !Array.isArray(value.publicAssets) ||
    value.publicAssets.some((asset) => !validatePublicAsset(asset)) ||
    new Set(value.publicAssets).size !== value.publicAssets.length
  ) {
    issues.push("publicAssets must be unique relative public paths");
  }

  if (issues.length > 0) throw new SaasManifestError(issues);

  const roles = (value.roles as Record<string, unknown>[]).map((role) =>
    Object.freeze({ name: role.name as string, description: role.description as string }),
  );
  return Object.freeze({
    schemaVersion: SAAS_MANIFEST_SCHEMA_VERSION,
    appName: value.appName as string,
    name: value.name as string,
    description: value.description as string,
    logo: value.logo as SaasAppManifest["logo"],
    basePath: value.basePath as string,
    healthPath: "/api/saas/health",
    shellVersion: value.shellVersion as string,
    roles: Object.freeze(roles),
    standaloneRoles: Object.freeze([...(value.standaloneRoles as string[])]),
    publicAssets: Object.freeze([...(value.publicAssets as string[])]),
  });
}

export function defineSaasManifest(value: SaasAppManifest): SaasAppManifest {
  return parseSaasManifest(value);
}
