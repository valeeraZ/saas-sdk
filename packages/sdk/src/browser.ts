import {
  parseFrameCurrentUser,
  parseFrameDspConfig,
  parseFramePermissions,
  type FrameCurrentUser,
  type FrameDspConfig,
  type FramePermissions,
} from "@frame/auth";
import type { FramePreferences } from "@frame/theme";

export type FrameAuthBrowserConfig = Readonly<{
  authServiceOrigin: string;
  tokenCookieName: string;
  dspConfigPath?: string;
  currentUserPath?: string;
  permissionsPath?: string;
}>;

export type FramePortalBrowserConfig = Readonly<{
  portalOrigin: string;
  sessionPath?: string;
  preferencesPath?: string;
}>;

export class FrameHttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "FrameHttpError";
    this.status = status;
  }
}

const COOKIE_NAME_PATTERN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function endpoint(originValue: string, path: string): string {
  const origin = new URL(originValue);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    (origin.pathname !== "/" && origin.pathname !== "") ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /[?#]/.test(path)
  ) {
    throw new Error("FRAME browser endpoint configuration is invalid");
  }
  return new URL(path, origin).toString();
}

export function readFrameBrowserToken(
  cookieName: string,
  cookieValue: string = document.cookie,
): string | null {
  if (!COOKIE_NAME_PATTERN.test(cookieName)) throw new Error("Invalid DSP token Cookie name");
  for (const segment of cookieValue.split(";")) {
    const separator = segment.indexOf("=");
    if (separator < 0 || segment.slice(0, separator).trim() !== cookieName) continue;
    try {
      const token = decodeURIComponent(segment.slice(separator + 1).trim());
      return token.length > 0 && token.length <= 8_192 && !CONTROL_CHARACTERS.test(token)
        ? token
        : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function frameFetch(
  input: string | URL,
  init: RequestInit & Readonly<{ token?: string | null }> = {},
): Promise<Response> {
  const { token, ...requestInit } = init;
  const headers = new Headers(requestInit.headers);
  if (headers.has("authorization")) {
    throw new Error("frameFetch owns the Authorization header");
  }
  if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(input, {
    ...requestInit,
    headers,
    credentials: requestInit.credentials ?? "omit",
  });
  if (!response.ok) {
    throw new FrameHttpError(response.status, `FRAME request failed with ${response.status}`);
  }
  return response;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new FrameHttpError(response.status, "FRAME response is not JSON");
  }
  return response.json() as Promise<unknown>;
}

export function buildDspAuthenticateUrl(config: FrameDspConfig, returnTo: string): string {
  const returnUrl = new URL(returnTo);
  if (!["http:", "https:"].includes(returnUrl.protocol)) {
    throw new Error("DSP return URL must use HTTP or HTTPS");
  }
  const authenticateUrl = new URL(config.authenticateUrl);
  authenticateUrl.searchParams.set("returnTo", returnUrl.toString());
  return authenticateUrl.toString();
}

export class FrameAuthBrowserClient {
  readonly #config: Required<FrameAuthBrowserConfig>;

  constructor(config: FrameAuthBrowserConfig) {
    this.#config = {
      ...config,
      dspConfigPath: config.dspConfigPath ?? "/config",
      currentUserPath: config.currentUserPath ?? "/v1/authorization/current_user",
      permissionsPath: config.permissionsPath ?? "/permissions",
    };
  }

  token(cookieValue?: string): string | null {
    return readFrameBrowserToken(this.#config.tokenCookieName, cookieValue);
  }

  async dspConfig(): Promise<FrameDspConfig> {
    const response = await frameFetch(
      endpoint(this.#config.authServiceOrigin, this.#config.dspConfigPath),
    );
    return parseFrameDspConfig(await readJson(response));
  }

  async currentUser(): Promise<FrameCurrentUser> {
    const response = await frameFetch(
      endpoint(this.#config.authServiceOrigin, this.#config.currentUserPath),
      { token: this.token() },
    );
    return parseFrameCurrentUser(await readJson(response));
  }

  async permissions(): Promise<FramePermissions> {
    const response = await frameFetch(
      endpoint(this.#config.authServiceOrigin, this.#config.permissionsPath),
      { token: this.token() },
    );
    return parseFramePermissions(await readJson(response));
  }

  async authenticate(returnTo: string = window.location.href): Promise<never> {
    const url = buildDspAuthenticateUrl(await this.dspConfig(), returnTo);
    window.location.assign(url);
    return new Promise<never>(() => undefined);
  }
}

export class FramePortalBrowserClient {
  readonly #config: Required<FramePortalBrowserConfig>;

  constructor(config: FramePortalBrowserConfig) {
    this.#config = {
      ...config,
      sessionPath: config.sessionPath ?? "/api/frame/session",
      preferencesPath: config.preferencesPath ?? "/api/frame/me/preferences",
    };
  }

  async session(): Promise<unknown> {
    const response = await frameFetch(
      endpoint(this.#config.portalOrigin, this.#config.sessionPath),
      { credentials: "include" },
    );
    return readJson(response);
  }

  async preferences(): Promise<FramePreferences> {
    const response = await frameFetch(
      endpoint(this.#config.portalOrigin, this.#config.preferencesPath),
      { credentials: "include" },
    );
    return readJson(response) as Promise<FramePreferences>;
  }

  async updatePreferences(
    patch: Partial<Pick<FramePreferences, "theme" | "sidebarCollapsed" | "hiddenApps">>,
  ): Promise<FramePreferences> {
    const response = await frameFetch(
      endpoint(this.#config.portalOrigin, this.#config.preferencesPath),
      {
        method: "PATCH",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    return readJson(response) as Promise<FramePreferences>;
  }
}
