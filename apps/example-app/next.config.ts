import { parseSaasManifest } from "@saas-platform/manifest-schema";
import { withSaasNextConfig } from "@saas-platform/next-config";

import manifestJson from "./saas.manifest.json";

const manifest = parseSaasManifest(manifestJson);

export default withSaasNextConfig(manifest, {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "saas-platform.example.invalid"],
    },
  },
});
