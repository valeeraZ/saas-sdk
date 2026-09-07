import { loadFrameRuntimeMode, resolveFrameServerSession } from "@frame/auth";
import { FrameShell } from "@frame/shell";
import { FramePortalSessionClient } from "@frame/shell/integrated-session";
import {
  buildStandaloneNavigation,
} from "@frame/shell/navigation";
import {
  createInitialFramePreferences,
  FRAME_SIDEBAR_COOKIE,
  FRAME_THEME_COOKIE,
} from "@frame/theme";
import "@frame/ui/globals.css";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "Local Alpha · FRAME" };

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const mode = loadFrameRuntimeMode();
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const initialPreferences = createInitialFramePreferences(
    cookieStore.get(FRAME_THEME_COOKIE)?.value,
    cookieStore.get(FRAME_SIDEBAR_COOKIE)?.value,
  );
  const session =
    mode === "standalone"
      ? await resolveFrameServerSession({ headers: requestHeaders }, mode)
      : await new FramePortalSessionClient().get({ headers: requestHeaders });
  const navigation = "navigation" in session
    ? session.navigation
    : buildStandaloneNavigation({
          appName: "local-alpha",
          name: "Local Alpha",
          description: "Same-cluster service",
          logo: "CircleGauge",
          basePath: "/alpha",
        });

  return (
    <html
      lang="en"
      className={initialPreferences.theme === "dark" ? "dark" : undefined}
      data-theme={initialPreferences.theme}
      suppressHydrationWarning
    >
      <body>
        <FrameShell
          canAccessAdmin={session.canAccessAdmin}
          currentAppLabel="Local Alpha"
          currentAppName="local-alpha"
          homeHref={mode === "standalone" ? "/alpha" : "/"}
          initialPreferences={initialPreferences}
          navigation={navigation}
          preferencesMode={mode === "standalone" ? "local" : "portal"}
          user={session.user}
        >
          {children}
        </FrameShell>
      </body>
    </html>
  );
}
