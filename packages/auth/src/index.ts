export type SaasCurrentUser = Readonly<{
  id: string;
  displayName: string;
  secondaryLabel: string;
}>;

export type SaasDspConfig = Readonly<{
  baseUrl: string;
  clientId: string;
  authenticateUrl: string;
}>;

export type SaasPermissionGrant = Readonly<{
  appName: string;
  roles: readonly string[];
}>;

export type SaasPermissions = Readonly<{
  apps: readonly SaasPermissionGrant[];
}>;

export type SaasServerSession = Readonly<{
  mode: SaasRuntimeMode;
  user: Readonly<{
    displayName: string;
    secondaryLabel: string;
  }>;
  grants: readonly SaasPermissionGrant[];
  canAccessAdmin: boolean;
}>;

export type SaasAuthConfig = Readonly<{
  dspConfigUrl: string;
  currentUserUrl: string;
  permissionsUrl: string;
  tokenCookieName: string;
  adminRoles: ReadonlySet<string>;
  timeoutMs: number;
  responseLimitBytes: number;
}>;

export type SaasAuthEnvironment = Readonly<Record<string, string | undefined>>;
export type SaasRuntimeMode = "integrated" | "standalone";
export type SaasAuthRequest = Readonly<{
  headers: Pick<Headers, "get">;
}>;

export type PermissionsErrorCategory =
  | "missing_token"
  | "unauthorized"
  | "unavailable"
  | "invalid_response";

export class SaasPermissionsError extends Error {
  readonly category: PermissionsErrorCategory;

  constructor(category: PermissionsErrorCategory, message: string) {
    super(message);
    this.name = "SaasPermissionsError";
    this.category = category;
  }
}

const USER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,199}$/;
const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const DEFAULT_ADMIN_ROLES = ["saas-admin", "saas-devops"] as const;
const DEFAULT_TIMEOUT_MS = 2_000;
const DEFAULT_RESPONSE_LIMIT_BYTES = 262_144;
const MAX_TOKEN_LENGTH = 8_192;
const APP_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ROLE_NAME_PATTERN = /^[a-z0-9]+(?:[-_:][a-z0-9]+)*$/;

export function loadSaasRuntimeMode(
  environment: SaasAuthEnvironment = process.env,
): SaasRuntimeMode {
  const mode = environment.SAAS_RUNTIME_MODE ?? "integrated";
  if (mode !== "integrated" && mode !== "standalone") {
    throw new Error("SAAS_RUNTIME_MODE must be integrated or standalone");
  }
  return mode;
}

function parsePositiveInteger(
  value: string | undefined,
  fallback: number,
  name: string,
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseAuthServiceUrl(value: string | undefined): URL {
  const baseUrl = new URL(value ?? "http://localhost:3200");
  if (!["http:", "https:"].includes(baseUrl.protocol)) {
    throw new Error("SAAS_AUTH_SERVICE_URL must use HTTP or HTTPS");
  }
  if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new Error("SAAS_AUTH_SERVICE_URL cannot contain credentials, query, or fragment");
  }
  if (baseUrl.pathname !== "/" && baseUrl.pathname !== "") {
    throw new Error("SAAS_AUTH_SERVICE_URL must be an origin without a path");
  }
  return baseUrl;
}

function parseEndpointPath(
  baseUrl: URL,
  value: string | undefined,
  fallback: string,
  name: string,
): string {
  const path = value ?? fallback;
  if (!path.startsWith("/") || path.startsWith("//") || /[?#]/.test(path)) {
    throw new Error(`${name} must be an absolute path without query or fragment`);
  }
  return new URL(path, baseUrl).toString();
}

function parseAdminRoles(value: string | undefined): ReadonlySet<string> {
  const roles = (value === undefined ? DEFAULT_ADMIN_ROLES : value.split(","))
    .map((role) => role.trim())
    .filter(Boolean);
  return new Set(roles);
}

export function loadSaasAuthConfig(
  environment: SaasAuthEnvironment = process.env,
): SaasAuthConfig {
  const authServiceUrl = parseAuthServiceUrl(environment.SAAS_AUTH_SERVICE_URL);
  const tokenCookieName = environment.SAAS_DSP_TOKEN_COOKIE ?? "dsp-token";
  if (!COOKIE_NAME_PATTERN.test(tokenCookieName)) {
    throw new Error("SAAS_DSP_TOKEN_COOKIE must be a valid Cookie name");
  }
  return Object.freeze({
    dspConfigUrl: parseEndpointPath(
      authServiceUrl,
      environment.SAAS_AUTH_DSP_CONFIG_PATH,
      "/config",
      "SAAS_AUTH_DSP_CONFIG_PATH",
    ),
    currentUserUrl: parseEndpointPath(
      authServiceUrl,
      environment.SAAS_AUTH_CURRENT_USER_PATH,
      "/v1/authorization/current_user",
      "SAAS_AUTH_CURRENT_USER_PATH",
    ),
    permissionsUrl: parseEndpointPath(
      authServiceUrl,
      environment.SAAS_AUTH_PERMISSIONS_PATH,
      "/permissions",
      "SAAS_AUTH_PERMISSIONS_PATH",
    ),
    tokenCookieName,
    adminRoles: parseAdminRoles(environment.SAAS_ADMIN_ROLES),
    timeoutMs: parsePositiveInteger(
      environment.SAAS_AUTH_TIMEOUT_MS,
      DEFAULT_TIMEOUT_MS,
      "SAAS_AUTH_TIMEOUT_MS",
    ),
    responseLimitBytes: parsePositiveInteger(
      environment.SAAS_AUTH_RESPONSE_LIMIT_BYTES,
      DEFAULT_RESPONSE_LIMIT_BYTES,
      "SAAS_AUTH_RESPONSE_LIMIT_BYTES",
    ),
  });
}

function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const segment of cookieHeader.split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 0 || segment.slice(0, separator).trim() !== name) continue;
    const encoded = segment.slice(separator + 1).trim();
    try {
      return decodeURIComponent(encoded);
    } catch {
      return null;
    }
  }
  return null;
}

export function readDspToken(
  request: SaasAuthRequest,
  tokenCookieName: string,
): string {
  const token = readCookie(request.headers.get("cookie"), tokenCookieName);
  if (!token || token.length > MAX_TOKEN_LENGTH || /[\u0000-\u001f\u007f]/.test(token)) {
    throw new SaasPermissionsError("missing_token", "A valid DSP session token is required");
  }
  return token;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRequiredString(
  value: Record<string, unknown>,
  field: string,
  allowEmpty = false,
): string {
  const candidate = value[field];
  if (typeof candidate !== "string" || (!allowEmpty && candidate.length === 0)) {
    throw new SaasPermissionsError(
      "invalid_response",
      `Auth Service response has an invalid ${field}`,
    );
  }
  return candidate;
}

export function parseSaasPermissions(value: unknown): SaasPermissions {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => key !== "apps") ||
    !Array.isArray(value.apps)
  ) {
    throw new SaasPermissionsError(
      "invalid_response",
      "Auth Service response does not match the permissions contract",
    );
  }

  const appNames = new Set<string>();
  const apps = value.apps.map((candidate, index): SaasPermissionGrant => {
    if (!isRecord(candidate)) {
      throw new SaasPermissionsError(
        "invalid_response",
        `Auth Service response has an invalid App at index ${index}`,
      );
    }
    const appName = readRequiredString(candidate, "appName");
    if (
      Object.keys(candidate).some((key) => key !== "appName" && key !== "roles") ||
      !APP_NAME_PATTERN.test(appName) ||
      appNames.has(appName)
    ) {
      throw new SaasPermissionsError(
        "invalid_response",
        `Auth Service response has an invalid or duplicate App at index ${index}`,
      );
    }
    if (
      !Array.isArray(candidate.roles) ||
      candidate.roles.length === 0 ||
      !candidate.roles.every(
        (role) => typeof role === "string" && ROLE_NAME_PATTERN.test(role),
      ) ||
      new Set(candidate.roles).size !== candidate.roles.length
    ) {
      throw new SaasPermissionsError(
        "invalid_response",
        `Auth Service response has invalid roles at index ${index}`,
      );
    }
    appNames.add(appName);
    return Object.freeze({
      appName,
      roles: Object.freeze([...candidate.roles]),
    });
  });

  return Object.freeze({ apps: Object.freeze(apps) });
}

/**
 * Temporary Phase 4 migration adapter. Runtime callers must opt into this
 * parser explicitly; the target parser above rejects Registry-owned fields.
 */
export function parseLegacySaasPermissions(value: unknown): SaasPermissions {
  if (!isRecord(value) || !Array.isArray(value.apps)) {
    throw new SaasPermissionsError(
      "invalid_response",
      "Auth Service legacy response does not match the permissions contract",
    );
  }
  return parseSaasPermissions({
    apps: value.apps.map((candidate) => {
      if (!isRecord(candidate)) return candidate;
      return { appName: candidate.appName, roles: candidate.roles };
    }),
  });
}

export function parseSaasCurrentUser(value: unknown): SaasCurrentUser {
  if (!isRecord(value)) {
    throw new SaasPermissionsError(
      "invalid_response",
      "Auth Service current-user response is invalid",
    );
  }
  const id =
    typeof value.employee_id === "string"
      ? value.employee_id
      : typeof value.id === "string"
        ? value.id
        : "";
  const displayName =
    typeof value.display_name === "string"
      ? value.display_name
      : typeof value.name === "string"
        ? value.name
        : "";
  const secondaryLabel =
    typeof value.email === "string" && value.email.length > 0 ? value.email : id;
  if (!USER_ID_PATTERN.test(id) || displayName.length === 0) {
    throw new SaasPermissionsError(
      "invalid_response",
      "Auth Service current-user response is invalid",
    );
  }
  return Object.freeze({ id, displayName, secondaryLabel });
}

export function parseSaasDspConfig(value: unknown): SaasDspConfig {
  if (!isRecord(value) || !isRecord(value.dsp) || !isRecord(value.dsp.url)) {
    throw new SaasPermissionsError(
      "invalid_response",
      "Auth Service DSP config response is invalid",
    );
  }
  const baseUrl = new URL(readRequiredString(value.dsp, "base_url"));
  if (
    !["http:", "https:"].includes(baseUrl.protocol) ||
    baseUrl.username ||
    baseUrl.password ||
    baseUrl.search ||
    baseUrl.hash
  ) {
    throw new SaasPermissionsError(
      "invalid_response",
      "Auth Service DSP base URL is invalid",
    );
  }
  const clientId = readRequiredString(value.dsp, "client_id");
  const authenticatePath = readRequiredString(value.dsp.url, "authenticate");
  const authenticateUrl = new URL(authenticatePath, baseUrl);
  if (
    !["http:", "https:"].includes(authenticateUrl.protocol) ||
    authenticateUrl.username ||
    authenticateUrl.password
  ) {
    throw new SaasPermissionsError(
      "invalid_response",
      "Auth Service DSP authenticate URL is invalid",
    );
  }
  return Object.freeze({
    baseUrl: baseUrl.toString(),
    clientId,
    authenticateUrl: authenticateUrl.toString(),
  });
}

async function readBoundedResponse(response: Response, limitBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > limitBytes) {
      await reader.cancel();
      throw new SaasPermissionsError(
        "invalid_response",
        "Auth Service response is too large",
      );
    }
    chunks.push(value);
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export class SaasPermissionsClient {
  readonly config: SaasAuthConfig;
  readonly fetchImplementation: typeof fetch;

  constructor(
    config: SaasAuthConfig = loadSaasAuthConfig(),
    fetchImplementation: typeof fetch = fetch,
  ) {
    this.config = config;
    this.fetchImplementation = fetchImplementation;
  }

  private async fetchJson(url: string, token?: string): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetchImplementation(url, {
        method: "GET",
        headers: {
          accept: "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new SaasPermissionsError("unauthorized", "DSP session is not authorized");
      }
      if (!response.ok) {
        throw new SaasPermissionsError(
          "unavailable",
          "Auth Service is unavailable",
        );
      }
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.startsWith("application/json")) {
        throw new SaasPermissionsError(
          "invalid_response",
          "Auth Service response is not JSON",
        );
      }
      const body = await readBoundedResponse(response, this.config.responseLimitBytes);
      try {
        return JSON.parse(body);
      } catch (error) {
        if (error instanceof SaasPermissionsError) throw error;
        throw new SaasPermissionsError(
          "invalid_response",
          "Auth Service response is malformed",
        );
      }
    } catch (error) {
      if (error instanceof SaasPermissionsError) throw error;
      throw new SaasPermissionsError(
        "unavailable",
        "Auth Service is unavailable",
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async get(request: SaasAuthRequest): Promise<SaasPermissions> {
    const token = readDspToken(request, this.config.tokenCookieName);
    return parseSaasPermissions(await this.fetchJson(this.config.permissionsUrl, token));
  }

  async getCurrentUser(request: SaasAuthRequest): Promise<SaasCurrentUser> {
    const token = readDspToken(request, this.config.tokenCookieName);
    return parseSaasCurrentUser(await this.fetchJson(this.config.currentUserUrl, token));
  }

  async getDspConfig(): Promise<SaasDspConfig> {
    return parseSaasDspConfig(await this.fetchJson(this.config.dspConfigUrl));
  }
}

export function hasSaasAdminRole(
  permissions: SaasPermissions,
  adminRoles: ReadonlySet<string>,
): boolean {
  if (adminRoles.size === 0) return false;
  return permissions.apps.some((app) =>
    app.roles.some((role) => adminRoles.has(role)),
  );
}

export async function resolveSaasServerSession(
  request: SaasAuthRequest,
  mode: SaasRuntimeMode = "integrated",
  client = new SaasPermissionsClient(),
): Promise<SaasServerSession> {
  if (mode === "standalone") {
    const currentUser = await client.getCurrentUser(request);
    return Object.freeze({
      mode,
      user: Object.freeze({
        displayName: currentUser.displayName,
        secondaryLabel: currentUser.secondaryLabel,
      }),
      grants: Object.freeze([]),
      canAccessAdmin: false,
    });
  }

  const [currentUser, permissions] = await Promise.all([
    client.getCurrentUser(request),
    client.get(request),
  ]);
  return Object.freeze({
    mode,
    user: Object.freeze({
      displayName: currentUser.displayName,
      secondaryLabel: currentUser.secondaryLabel,
    }),
    grants: permissions.apps,
    canAccessAdmin: hasSaasAdminRole(permissions, client.config.adminRoles),
  });
}
