import { Suspense } from "react";
import { getSaasTenant } from "@saas-platform/sdk/tenant-next";
import { SaasTenantLink } from "@saas-platform/sdk/tenant-react";
import { tenantImageUrl, tenantHref } from "@saas-platform/sdk/tenant";
import { getTranslations } from "next-intl/server";
import { SaasPageHeader } from "@saas-platform/shell/page-header";
import { Button } from "@saas-platform/ui/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@saas-platform/ui/components/card";
async function Streaming() {
  const t = await getTranslations("App");
  await new Promise((resolve) => setTimeout(resolve, 80));
  return <p>{t("streamed")}</p>;
}
export default async function Page() {
  const context = await getSaasTenant(),
    t = await getTranslations("App");
  return (
    <div className="flex flex-col gap-8">
      <SaasPageHeader
        title="__APP_TITLE__"
        description={t("tenant", { id: context.tenantId })}
        actions={
          <Button asChild>
            <SaasTenantLink href="/notes">{t("notesLink")}</SaasTenantLink>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("resources")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <img
              alt={t("publicAsset")}
              width="32"
              height="32"
              src={tenantHref(context, "/public/pixel.png")}
            />
            <img
              alt={t("optimizedAsset")}
              width="64"
              height="64"
              src={tenantImageUrl(context, "/public/pixel.png", 64)}
            />
          </div>
          <Suspense fallback={<p>{t("streaming")}</p>}>
            <Streaming />
          </Suspense>
        </CardContent>
      </Card>
      <Button asChild variant="outline">
        <a href="/">{t("portal")}</a>
      </Button>
    </div>
  );
}
