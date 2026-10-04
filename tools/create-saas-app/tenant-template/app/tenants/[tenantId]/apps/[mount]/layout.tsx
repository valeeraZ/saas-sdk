import { getSaasTenant } from "@saas-platform/sdk/tenant-next";
import { tenantHref, publicTenantContext } from "@saas-platform/sdk/tenant";
import { SaasTenantProvider } from "@saas-platform/sdk/tenant-react";
import { SaasShell } from "@saas-platform/shell";
import { SaasPresentationControls } from "@saas-platform/shell/presentation-controls";
import { getSaasShellMessages } from "@saas-platform/shell/messages";
import {
  createSaasPresentation,
  DEFAULT_SAAS_PREFERENCES,
} from "@saas-platform/theme";
import { getTranslations } from "next-intl/server";
export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const context = await getSaasTenant();
  return { icons: { icon: tenantHref(context, "/public/pixel.png") } };
}
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getSaasTenant(),
    t = await getTranslations("App"),
    presentation = createSaasPresentation(context.presentation);
  return (
    <SaasTenantProvider context={publicTenantContext(context)}>
      <SaasShell
        canAccessAdmin={false}
        currentAppName="__APP_NAME__"
        currentAppLabel="__APP_TITLE__"
        preferencesMode="local"
        homeHref="/"
        initialPreferences={{
          ...DEFAULT_SAAS_PREFERENCES,
          theme: presentation.theme,
          sidebarCollapsed: presentation.sidebarCollapsed,
        }}
        messages={getSaasShellMessages(presentation.locale)}
        headerActions={
          <SaasPresentationControls locale={presentation.locale} />
        }
        navigation={[
          {
            appName: null,
            href: "/",
            label: t("portal"),
            description: t("portal"),
            kind: "home",
            section: "platform",
          },
          {
            appName: "__APP_NAME__",
            href: tenantHref(context, "/"),
            label: "__APP_TITLE__",
            description: t("resources"),
            kind: "app",
            section: "apps",
          },
        ]}
        user={{
          displayName: context.userId,
          secondaryLabel: t("tenant", { id: context.tenantId }),
        }}
      >
        {children}
      </SaasShell>
    </SaasTenantProvider>
  );
}
