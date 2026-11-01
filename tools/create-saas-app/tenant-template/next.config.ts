import { withSaasTenantNextConfig } from "@saas-platform/next-config";
import createNextIntlPlugin from "next-intl/plugin";
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
export default withNextIntl(
  withSaasTenantNextConfig(
    {
      mount: "__APP_NAME__",
      assetVersion: process.env.SAAS_ASSET_VERSION!,
      portalOrigin: process.env.SAAS_PORTAL_ORIGIN!,
    },
    { generateBuildId: async () => process.env.SAAS_ASSET_VERSION! },
  ),
);
