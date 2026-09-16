"use client";
import { createContext, use, type ReactNode, type ComponentProps } from "react";
import Link from "next/link.js";
import { useRouter } from "next/navigation.js";
import { tenantHref, type SaasTenantContext } from "./tenant.ts";
const Context = createContext<SaasTenantContext | null>(null);
export function SaasTenantProvider({
  context,
  children,
}: {
  context: SaasTenantContext;
  children: ReactNode;
}) {
  return <Context value={context}>{children}</Context>;
}
export function useSaasTenant() {
  const context = use(Context);
  if (!context) throw new Error("SaasTenantProvider is required");
  return context;
}
export function SaasTenantLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  return <Link {...props} href={tenantHref(useSaasTenant(), href)} />;
}
export function useSaasTenantRouter() {
  const router = useRouter(),
    context = useSaasTenant();
  return {
    push: (path: string) => router.push(tenantHref(context, path)),
    replace: (path: string) => router.replace(tenantHref(context, path)),
    refresh: () => router.refresh(),
    back: () => router.back(),
    forward: () => router.forward(),
  };
}
// Moving between applications requires a new Next.js document/router tree.
export function SaasApplicationLink(props: ComponentProps<"a">) {
  return <a {...props} />;
}
