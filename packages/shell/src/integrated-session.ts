import type { SaasNavigationItem } from "./navigation.ts";

export type IntegratedSaasSession = Readonly<{
  mode: "integrated";
  user: Readonly<{
    displayName: string;
    secondaryLabel: string;
  }>;
  navigation: readonly SaasNavigationItem[];
  canAccessAdmin: boolean;
}>;

export type SaasPortalSessionConfig = Readonly<{
  endpoint: string;
  timeoutMs: number;
  responseLimitBytes: number;
}>;

export class SaasPortalSessionError extends Error {
  readonly category: "configuration" | "unauthorized" | "unavailable" | "invalid_response";

  constructor(
    category: SaasPortalSessionError["category"],
    message: string,
  ) {
    super(message);
    this.name = "SaasPortalSessionError";
    this.category = category;
  }
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new SaasPortalSessionError("configuration", `${name} must be a positive integer`);
  }
  return parsed;
}

export function loadSaasPortalSessionConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): SaasPortalSessionConfig {
  const origin = new URL(environment.SAAS_PORTAL_ORIGIN ?? "http://localhost:3000");
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    (origin.pathname !== "/" && origin.pathname !== "")
  ) {
    throw new SaasPortalSessionError(
      "configuration",
      "SAAS_PORTAL_ORIGIN must be an HTTP(S) origin",
    );
  }
  const path = environment.SAAS_PORTAL_SESSION_PATH ?? "/api/saas/session";
  if (!path.startsWith("/") || path.startsWith("//") || /[?#]/.test(path)) {
    throw new SaasPortalSessionError(
      "configuration",
      "SAAS_PORTAL_SESSION_PATH must be an absolute path",
    );
  }
  return Object.freeze({
    endpoint: new URL(path, origin).toString(),
    timeoutMs: positiveInteger(
      environment.SAAS_PORTAL_SESSION_TIMEOUT_MS,
      2_000,
      "SAAS_PORTAL_SESSION_TIMEOUT_MS",
    ),
    responseLimitBytes: positiveInteger(
      environment.SAAS_PORTAL_SESSION_RESPONSE_LIMIT_BYTES,
      262_144,
      "SAAS_PORTAL_SESSION_RESPONSE_LIMIT_BYTES",
    ),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const NAVIGATION_FIELDS = new Set([
  "appName",
  "description",
  "href",
  "kind",
  "label",
  "requiresAdmin",
  "section",
]);
const NAVIGATION_KINDS = new Set([
  "home",
  "admin",
  "settings",
  "app",
  "chart",
  "alpha",
  "beta",
  "remote",
]);

export function parseIntegratedSaasSession(value: unknown): IntegratedSaasSession {
  if (
    !isRecord(value) ||
    Object.keys(value).some(
      (key) =>
        key !== "mode" &&
        key !== "user" &&
        key !== "navigation" &&
        key !== "canAccessAdmin",
    ) ||
    value.mode !== "integrated" ||
    !isRecord(value.user) ||
    Object.keys(value.user).some(
      (key) => key !== "displayName" && key !== "secondaryLabel",
    ) ||
    typeof value.user.displayName !== "string" ||
    value.user.displayName.length === 0 ||
    typeof value.user.secondaryLabel !== "string" ||
    typeof value.canAccessAdmin !== "boolean" ||
    !Array.isArray(value.navigation)
  ) {
    throw new SaasPortalSessionError(
      "invalid_response",
      "Portal session response is invalid",
    );
  }

  const navigation = value.navigation.map((item, index): SaasNavigationItem => {
    if (
      !isRecord(item) ||
      Object.keys(item).some((key) => !NAVIGATION_FIELDS.has(key)) ||
      (item.appName !== null && typeof item.appName !== "string") ||
      typeof item.description !== "string" ||
      typeof item.href !== "string" ||
      !item.href.startsWith("/") ||
      typeof item.kind !== "string" ||
      !NAVIGATION_KINDS.has(item.kind) ||
      typeof item.label !== "string" ||
      (item.requiresAdmin !== undefined && typeof item.requiresAdmin !== "boolean") ||
      (item.section !== "platform" && item.section !== "apps")
    ) {
      throw new SaasPortalSessionError(
        "invalid_response",
        `Portal session has invalid Navigation at index ${index}`,
      );
    }
    return Object.freeze({
      appName: item.appName,
      description: item.description,
      href: item.href,
      kind: item.kind as SaasNavigationItem["kind"],
      label: item.label,
      ...(item.requiresAdmin === undefined
        ? {}
        : { requiresAdmin: item.requiresAdmin }),
      section: item.section,
    });
  });

  return Object.freeze({
    mode: "integrated",
    user: Object.freeze({
      displayName: value.user.displayName,
      secondaryLabel: value.user.secondaryLabel,
    }),
    navigation: Object.freeze(navigation),
    canAccessAdmin: value.canAccessAdmin,
  });
}

async function readBoundedJson(response: Response, limitBytes: number): Promise<unknown> {
  if (!response.body) {
    throw new SaasPortalSessionError("invalid_response", "Portal session response is empty");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limitBytes) {
      await reader.cancel();
      throw new SaasPortalSessionError(
        "invalid_response",
        "Portal session response is too large",
      );
    }
    chunks.push(value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body)) as unknown;
  } catch {
    throw new SaasPortalSessionError(
      "invalid_response",
      "Portal session response is malformed",
    );
  }
}

export class SaasPortalSessionClient {
  readonly #config: SaasPortalSessionConfig;
  readonly #fetch: typeof fetch;

  constructor(
    config = loadSaasPortalSessionConfig(),
    fetchImplementation: typeof fetch = fetch,
  ) {
    this.#config = config;
    this.#fetch = fetchImplementation;
  }

  async get(request: Readonly<{ headers: Pick<Headers, "get"> }>): Promise<IntegratedSaasSession> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#config.timeoutMs);
    timeout.unref?.();
    try {
      const cookie = request.headers.get("cookie");
      const response = await this.#fetch(this.#config.endpoint, {
        headers: {
          accept: "application/json",
          ...(cookie ? { cookie } : {}),
        },
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal,
      });
      if (response.status === 401 || response.status === 403) {
        throw new SaasPortalSessionError(
          "unauthorized",
          "Portal session is not authorized",
        );
      }
      if (!response.ok) {
        throw new SaasPortalSessionError("unavailable", "Portal session is unavailable");
      }
      return parseIntegratedSaasSession(
        await readBoundedJson(response, this.#config.responseLimitBytes),
      );
    } catch (error) {
      if (error instanceof SaasPortalSessionError) throw error;
      throw new SaasPortalSessionError("unavailable", "Portal session is unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }
}
