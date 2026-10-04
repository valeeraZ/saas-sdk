import { createSaasPresentation } from "@saas-platform/theme";
import { AsyncLocalStorage } from "node:async_hooks";
import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { IncomingMessage, type ServerResponse } from "node:http";
import { jwtVerify, errors } from "jose";
import {
  tenantBasePath,
  publicTenantContext,
  type SaasTenantContext,
} from "./tenant.ts";
export type SaasTenantServerOptions = {
  mount: string;
  assetVersion: string;
  issuer: string;
  appId: string;
  deploymentId: string;
  key: CryptoKey | Uint8Array;
  claimReplay: (jti: string, expiresAt: number) => Promise<boolean>;
  maxBodyBytes?: number;
};
const contextStore = new AsyncLocalStorage<SaasTenantContext>();
export function requireSaasTenant(): SaasTenantContext {
  const context = contextStore.getStore();
  if (!context) throw new Error("Verified tenant request context is required");
  return context;
}
class RequestError extends Error {
  readonly status: number;
  constructor(status: number) {
    super("Request rejected");
    this.status = status;
  }
}
function staticPrefix(options: SaasTenantServerOptions) {
  if (
    !/^[a-z][a-z0-9-]{0,62}$/.test(options.mount) ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(options.assetVersion)
  )
    throw new Error("Invalid application asset namespace");
  return `/app-assets/${options.mount}/${options.assetVersion}`;
}
function replayRequest(
  req: IncomingMessage,
  bytes: Buffer,
  url = req.url,
): IncomingMessage {
  if (["GET", "HEAD"].includes(req.method ?? "") && !bytes.length) {
    req.url = url;
    return req;
  }
  const copy = new IncomingMessage(req.socket);
  copy.method = req.method;
  copy.url = url;
  copy.headers = { ...req.headers };
  copy.complete = true;
  copy.rawHeaders = [...req.rawHeaders];
  copy.httpVersion = req.httpVersion;
  if (bytes.length) copy.push(bytes);
  copy.push(null);
  return copy;
}
export function createSaasTenantHandler(
  handle: (req: IncomingMessage, res: ServerResponse) => unknown,
  options: SaasTenantServerOptions,
) {
  const prefix = staticPrefix(options);
  process.env.SAAS_INTERNAL_CONTEXT_KEY ??= randomBytes(32).toString("hex");
  const issuer = new URL(options.issuer);
  if (issuer.origin !== options.issuer || issuer.username || issuer.password)
    throw new Error("Issuer must be a Portal origin");
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? "/", issuer);
      const staticPath = url.pathname.slice(prefix.length);
      if (
        url.pathname.startsWith(prefix + "/_next/static/") &&
        ["GET", "HEAD"].includes(req.method ?? "") &&
        !url.search &&
        /^\/_next\/static\/[a-zA-Z0-9_./-]+$/.test(staticPath) &&
        !staticPath
          .split("/")
          .slice(1)
          .some((part) => !part || part === "." || part === "..") &&
        /\.(js|css|woff2?|ttf|otf)$/.test(staticPath)
      ) {
        const copy = replayRequest(req, Buffer.alloc(0), staticPath);
        delete copy.headers.cookie;
        delete copy.headers.authorization;
        delete copy.headers["x-saas-request"];
        delete copy.headers["x-saas-verified-context"];
        return await handle(copy, res);
      }
      const match = /^\/tenants\/([^/]+)\/apps\/([^/]+)(?:\/|$)/.exec(
        url.pathname,
      );
      if (!match || match[2] !== options.mount) throw new RequestError(404);
      const basePath = tenantBasePath(match[1], options.mount);
      const token = req.headers["x-saas-request"];
      if (typeof token !== "string") throw new RequestError(401);
      if (
        req.headers.cookie ||
        req.headers.authorization ||
        req.headers["x-portal-key"]
      )
        throw new RequestError(403);
      if (
        !["GET", "HEAD"].includes(req.method ?? "") &&
        req.headers.origin !== options.issuer
      )
        throw new RequestError(403);
      const { payload: p } = await jwtVerify(token, options.key, {
        algorithms: ["RS256"],
        issuer: options.issuer,
        audience: options.appId,
        requiredClaims: ["sub", "jti", "iat", "exp"],
        maxTokenAge: "30s",
      });
      const uuid =
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
      if (
        p.tenantId !== match[1] ||
        p.basePath !== basePath ||
        p.deploymentId !== options.deploymentId ||
        p.method !== req.method ||
        p.path !== req.url ||
        !uuid.test(p.sub ?? "") ||
        !uuid.test(p.jti ?? "") ||
        typeof p.exp !== "number" ||
        typeof p.iat !== "number" ||
        p.exp - p.iat > 30 ||
        !Array.isArray(p.roles) ||
        !p.roles.length ||
        p.roles.length > 100 ||
        !p.roles.every(
          (role) =>
            typeof role === "string" && role.length > 0 && role.length <= 100,
        ) ||
        typeof p.bodyHash !== "string" ||
        !/^[a-f0-9]{64}$/.test(p.bodyHash)
      )
        throw new RequestError(403);
      const chunks: Buffer[] = [];
      let size = 0;
      const limit = options.maxBodyBytes ?? 8 * 1024 * 1024;
      if (Number(req.headers["content-length"] ?? 0) > limit)
        throw new RequestError(413);
      for await (const chunk of req) {
        size += chunk.length;
        if (size > limit) throw new RequestError(413);
        chunks.push(Buffer.from(chunk));
      }
      const bytes = Buffer.concat(chunks);
      if (createHash("sha256").update(bytes).digest("hex") !== p.bodyHash)
        throw new RequestError(403);
      if (!(await options.claimReplay(p.jti!, p.exp!)))
        throw new RequestError(401);
      const context = publicTenantContext({
        tenantId: match[1],
        userId: p.sub!,
        appId: options.appId,
        deploymentId: options.deploymentId,
        mount: options.mount,
        basePath,
        roles: p.roles as string[],
        presentation: createSaasPresentation(p.presentation),
      });
      let internalUrl = req.url;
      const rest = url.pathname.slice(basePath.length);
      if (rest.startsWith("/public/")) {
        const relative = rest.slice("/public".length);
        if (
          /%|\\/.test(relative) ||
          relative.split("/").some((part) => part === "." || part === "..")
        )
          throw new RequestError(400);
        internalUrl = relative + url.search;
      } else if (rest === "/_next/image") {
        const source = url.searchParams.get("url") ?? "";
        if (
          !source.startsWith(basePath + "/public/") ||
          /%|\\/.test(source) ||
          new URL(source, issuer).pathname !== source
        )
          throw new RequestError(400);
        url.searchParams.set(
          "url",
          source.slice((basePath + "/public").length),
        );
        internalUrl = "/_next/image" + url.search;
      }
      const copy = replayRequest(req, bytes, internalUrl);
      const value = Buffer.from(
        JSON.stringify({
          context,
          expiresAt: Math.min(Date.now() + 30000, p.exp! * 1000),
        }),
      ).toString("base64url");
      const mac = createHmac("sha256", process.env.SAAS_INTERNAL_CONTEXT_KEY!)
        .update(value)
        .digest("hex");
      copy.headers["x-saas-verified-context"] = value + "." + mac;
      return await contextStore.run(context, () => handle(copy, res));
    } catch (error) {
      const status =
        error instanceof RequestError
          ? error.status
          : error instanceof errors.JOSEError
            ? 401
            : 503;
      if (!res.headersSent) {
        res.writeHead(status, {
          "content-type": "application/json",
          "cache-control": "no-store",
        });
        res.end(
          JSON.stringify({
            error:
              status === 401 ? "unauthorized" : "application_request_rejected",
          }),
        );
      } else res.destroy();
    }
  };
}

/** Context survives Next render dispatch without sharing an AsyncLocalStorage instance. */
export function readSaasVerifiedContext(value: string): SaasTenantContext {
  const key = process.env.SAAS_INTERNAL_CONTEXT_KEY;
  const [payload, signature, extra] = value.split(".");
  if (!key || !payload || !/^[a-f0-9]{64}$/.test(signature ?? "") || extra)
    throw new Error("Verified tenant context missing");
  const expected = createHmac("sha256", key).update(payload).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex")))
    throw new Error("Invalid tenant context");
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (typeof data.expiresAt !== "number" || data.expiresAt <= Date.now())
    throw new Error("Expired tenant context");
  return publicTenantContext(data.context);
}
