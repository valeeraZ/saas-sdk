import { loadSaasRuntimeMode, resolveSaasServerSession } from "@saas-platform/auth";
import { SaasShell } from "@saas-platform/shell";
import { SaasPortalSessionClient } from "@saas-platform/shell/integrated-session";
import {
  buildStandaloneNavigation,
} from "@saas-platform/shell/navigation";
import {
  createInitialSaasPreferences,
  SAAS_SIDEBAR_COOKIE,
  SAAS_THEME_COOKIE,
} from "@saas-platform/theme";
import "@saas-platform/ui/globals.css";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Remote Gamma · SAAS" };

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const mode = loadSaasRuntimeMode();
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const initialPreferences = createInitialSaasPreferences(
    cookieStore.get(SAAS_THEME_COOKIE)?.value,
    cookieStore.get(SAAS_SIDEBAR_COOKIE)?.value,
  );
  const session =
    mode === "standalone"
      ? await resolveSaasServerSession({ headers: requestHeaders }, mode)
      : await new SaasPortalSessionClient().get({ headers: requestHeaders });
  const navigation = "navigation" in session
    ? session.navigation
    : buildStandaloneNavigation({
          appName: "remote-gamma",
          name: "Remote Gamma",
          description: "Remote-cluster ingress",
          logo: "Orbit",
          basePath: "/remote",
        });

  return (
    <html
      lang="en"
      className={initialPreferences.theme === "dark" ? "dark" : undefined}
      data-theme={initialPreferences.theme}
      suppressHydrationWarning
    >
      <body>
        <SaasShell
          canAccessAdmin={session.canAccessAdmin}
          currentAppLabel="Remote Gamma"
          currentAppName="remote-gamma"
          homeHref={mode === "standalone" ? "/remote" : "/"}
          initialPreferences={initialPreferences}
          navigation={navigation}
          preferencesMode={mode === "standalone" ? "local" : "portal"}
          user={session.user}
        >
          {children}
        </SaasShell>
      </body>
    </html>
  );
}
