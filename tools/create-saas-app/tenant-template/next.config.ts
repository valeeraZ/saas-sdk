import { withSaasTenantNextConfig } from "@saas-platform/next-config";
export default withSaasTenantNextConfig(
  {
    mount: "__APP_NAME__",
    assetVersion: process.env.SAAS_ASSET_VERSION!,
    portalOrigin: process.env.SAAS_PORTAL_ORIGIN!,
  },
  {
    generateBuildId: async () => process.env.SAAS_ASSET_VERSION!,
  },
);
