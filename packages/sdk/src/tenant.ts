export type SaasTenantContext = Readonly<{
  tenantId: string;
  userId: string;
  appId: string;
  deploymentId: string;
  mount: string;
  basePath: string;
  roles: readonly string[];
}>;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function tenantBasePath(tenantId: string, mount: string): string {
  if (!uuid.test(tenantId) || !/^[a-z][a-z0-9-]{0,62}$/.test(mount))
    throw new Error("Invalid tenant application path");
  return `/tenants/${tenantId}/apps/${mount}`;
}
export function tenantHref(
  context: Pick<SaasTenantContext, "tenantId" | "mount">,
  path = "/",
): string {
  const base = tenantBasePath(context.tenantId, context.mount);
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(path)
  )
    throw new Error("Application link must be a local path");
  const url = new URL(path, "https://application.invalid");
  for (const segment of path.split(/[?#]/)[0].split("/")) {
    const value = decodeURIComponent(segment);
    if ([".", ".."].includes(value) || /[/\\%\u0000-\u001f\u007f]/.test(value))
      throw new Error("Unsafe application link");
  }
  return base + url.pathname + url.search + url.hash;
}
export function publicTenantContext(
  context: SaasTenantContext,
): SaasTenantContext {
  return Object.freeze({
    tenantId: context.tenantId,
    userId: context.userId,
    appId: context.appId,
    deploymentId: context.deploymentId,
    mount: context.mount,
    basePath: tenantBasePath(context.tenantId, context.mount),
    roles: Object.freeze([...context.roles]),
  });
}
export async function tenantFetch(
  context: SaasTenantContext,
  path: string,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  for (const name of [
    "authorization",
    "x-saas-request",
    "x-tenant-id",
    "x-portal-key",
  ])
    if (headers.has(name))
      throw new Error("Identity is owned by the Portal session");
  return fetch(tenantHref(context, path), {
    ...init,
    headers,
    credentials: "same-origin",
  });
}
export function tenantImageUrl(
  context: SaasTenantContext,
  source: string,
  width: number,
  quality = 75,
) {
  if (
    !source.startsWith("/public/") ||
    !Number.isInteger(width) ||
    width < 1 ||
    width > 4096 ||
    !Number.isInteger(quality) ||
    quality < 1 ||
    quality > 100
  )
    throw new Error("Invalid application image");
  const query = new URLSearchParams({
    url: tenantHref(context, source),
    w: String(width),
    q: String(quality),
  });
  return tenantHref(context, "/_next/image") + "?" + query;
}
