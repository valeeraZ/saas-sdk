import {
  createSaasPresentation,
  type SaasPresentation,
} from "@saas-platform/theme";
export type SaasAppContext = Readonly<{
  userId: string;
  user: Readonly<{id:string;displayName:string;email:string}>;
  appId: string;
  deploymentId: string;
  mount: string;
  basePath: string;
  roles: readonly string[];
  presentation?: SaasPresentation;
}>;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function appBasePath(mount: string): string {
  if (!/^[a-z][a-z0-9-]{0,62}$/.test(mount))
    throw new Error("Invalid application path");
  return `/apps/${mount}`;
}
export function appHref(
  context: Pick<SaasAppContext, "mount">,
  path = "/",
): string {
  const base = appBasePath(context.mount);
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
export function publicAppContext(
  context: SaasAppContext,
): SaasAppContext {
  return Object.freeze({
    userId: context.userId,
    user: Object.freeze({id:context.user.id,displayName:context.user.displayName,email:context.user.email}),
    appId: context.appId,
    deploymentId: context.deploymentId,
    mount: context.mount,
    basePath: appBasePath(context.mount),
    roles: Object.freeze([...context.roles]),
    presentation: Object.freeze(createSaasPresentation(context.presentation)),
  });
}
export async function appFetch(
  context: SaasAppContext,
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
  return fetch(appHref(context, path), {
    ...init,
    headers,
    credentials: "same-origin",
  });
}
export function appImageUrl(
  context: SaasAppContext,
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
    url: appHref(context, source),
    w: String(width),
    q: String(quality),
  });
  return appHref(context, "/_next/image") + "?" + query;
}
