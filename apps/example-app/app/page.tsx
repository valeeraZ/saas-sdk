import { parseSaasManifest } from "@saas-platform/manifest-schema";
import { saasPublicAsset } from "@saas-platform/sdk";

import manifestJson from "../saas.manifest.json";
import { ReleaseReadiness } from "./release-readiness.tsx";

const manifest = parseSaasManifest(manifestJson);

export default function Page() {
  return (
    <ReleaseReadiness
      assetUrl={saasPublicAsset(manifest, "saas-path.svg")}
      basePath={manifest.basePath}
      shellVersion={manifest.shellVersion}
    />
  );
}
