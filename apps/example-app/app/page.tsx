import { parseFrameManifest } from "@frame/manifest-schema";
import { framePublicAsset } from "@frame/sdk";

import manifestJson from "../frame.manifest.json";
import { ReleaseReadiness } from "./release-readiness.tsx";

const manifest = parseFrameManifest(manifestJson);

export default function Page() {
  return (
    <ReleaseReadiness
      assetUrl={framePublicAsset(manifest, "frame-path.svg")}
      basePath={manifest.basePath}
      shellVersion={manifest.shellVersion}
    />
  );
}
