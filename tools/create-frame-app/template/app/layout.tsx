import { parseFrameManifest } from "@frame/manifest-schema";
import { FrameAppSessionProvider } from "@frame/sdk/react";
import { resolveFrameAppSession } from "@frame/sdk/server";
import { FrameShell } from "@frame/shell";
import { createInitialFramePreferences, FRAME_SIDEBAR_COOKIE, FRAME_THEME_COOKIE } from "@frame/theme";
import "@frame/ui/globals.css";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";

import manifestJson from "../frame.manifest.json";

const manifest = parseFrameManifest(manifestJson);

export default async function Layout({ children }: Readonly<{ children: ReactNode }>) {
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()]);
  const preferences = createInitialFramePreferences(
    cookieStore.get(FRAME_THEME_COOKIE)?.value,
    cookieStore.get(FRAME_SIDEBAR_COOKIE)?.value,
  );
  const session = await resolveFrameAppSession({ headers: requestHeaders }, manifest);
  return (
    <html lang="en" data-theme={preferences.theme} suppressHydrationWarning>
      <body>
        <FrameAppSessionProvider session={session}>
          <FrameShell
            canAccessAdmin={session.canAccessAdmin}
            currentAppLabel={manifest.name}
            currentAppName={manifest.appName}
            homeHref={session.homeHref}
            initialPreferences={preferences}
            navigation={session.navigation}
            preferencesMode={session.preferencesMode}
            user={session.user}
          >
            {children}
          </FrameShell>
        </FrameAppSessionProvider>
      </body>
    </html>
  );
}
