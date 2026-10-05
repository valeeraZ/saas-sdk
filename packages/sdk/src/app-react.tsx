"use client";
import { createContext, use, type ReactNode, type ComponentProps } from "react";
import Link from "next/link.js";
import { useRouter } from "next/navigation.js";
import { appHref, type SaasAppContext } from "./app.ts";
const Context = createContext<SaasAppContext | null>(null);
export function SaasAppProvider({
  context,
  children,
}: {
  context: SaasAppContext;
  children: ReactNode;
}) {
  return <Context value={context}>{children}</Context>;
}
export function useSaasApp() {
  const context = use(Context);
  if (!context) throw new Error("SaasAppProvider is required");
  return context;
}
export function SaasAppLink({
  href,
  ...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  return <Link {...props} href={appHref(useSaasApp(), href)} />;
}
export function useSaasAppRouter() {
  const router = useRouter(),
    context = useSaasApp();
  return {
    push: (path: string) => router.push(appHref(context, path)),
    replace: (path: string) => router.replace(appHref(context, path)),
    refresh: () => router.refresh(),
    back: () => router.back(),
    forward: () => router.forward(),
  };
}
// Moving between applications requires a new Next.js document/router tree.
export function SaasApplicationLink(props: ComponentProps<"a">) {
  return <a {...props} />;
}
