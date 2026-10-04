import { parseSaasManifest } from "@saas-platform/manifest-schema";
import { SaasAppSessionProvider } from "@saas-platform/sdk/react";
import { resolveSaasAppSession } from "@saas-platform/sdk/server";
import { getSaasShellMessages } from "@saas-platform/shell/messages";
import { SaasPresentationControls } from "@saas-platform/shell/presentation-controls";
import {
  SAAS_LOCALE_COOKIE,
  createSaasPresentation,
} from "@saas-platform/theme";
import { SaasShell } from "@saas-platform/shell";
import {
  createInitialSaasPreferences,
  SAAS_SIDEBAR_COOKIE,
  SAAS_THEME_COOKIE,
} from "@saas-platform/theme";
import "@saas-platform/ui/globals.css";
import { cookies, headers } from "next/headers";
import type { ReactNode } from "react";

import manifestJson from "../saas.manifest.json";

const manifest = parseSaasManifest(manifestJson);

export default async function Layout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [cookieStore, requestHeaders] = await Promise.all([
    cookies(),
    headers(),
  ]);
  const preferences = createInitialSaasPreferences(
    cookieStore.get(SAAS_THEME_COOKIE)?.value,
    cookieStore.get(SAAS_SIDEBAR_COOKIE)?.value,
  );
  const { locale } = createSaasPresentation({
    locale: cookieStore.get(SAAS_LOCALE_COOKIE)?.value ?? "en",
  });
  const session = await resolveSaasAppSession(
    { headers: requestHeaders },
    manifest,
  );
  return (
    <html
      lang={locale}
      className={preferences.theme === "dark" ? "dark" : undefined}
      data-theme={preferences.theme}
      suppressHydrationWarning
    >
      <body>
        <SaasAppSessionProvider session={session}>
          <SaasShell
            messages={getSaasShellMessages(locale)}
            headerActions={<SaasPresentationControls locale={locale} />}
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
          </SaasShell>
        </SaasAppSessionProvider>
      </body>
    </html>
  );
}
