import { parseFrameManifest } from "@frame/manifest-schema";
import { withFrameNextConfig } from "@frame/next-config";

import manifestJson from "./frame.manifest.json";

const manifest = parseFrameManifest(manifestJson);

export default withFrameNextConfig(manifest, {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "frame.com"],
    },
  },
});
