import { parseSaasManifest } from "@saas-platform/manifest-schema";
import { withSaasNextConfig } from "@saas-platform/next-config";

import manifestJson from "./saas.manifest.json";

export default withSaasNextConfig(parseSaasManifest(manifestJson));
