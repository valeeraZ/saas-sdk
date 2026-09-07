import { parseFrameManifest } from "@frame/manifest-schema";
import { withFrameNextConfig } from "@frame/next-config";

import manifestJson from "./frame.manifest.json";

export default withFrameNextConfig(parseFrameManifest(manifestJson));
