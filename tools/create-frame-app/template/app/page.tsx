import { parseFrameManifest } from "@frame/manifest-schema";
import { FramePageHeader } from "@frame/shell/page-header";

import manifestJson from "../frame.manifest.json";

const manifest = parseFrameManifest(manifestJson);

export default function Page() {
  return (
    <FramePageHeader
      breadcrumbs={[{ label: "Apps" }, { label: manifest.name }]}
      description={manifest.description}
      title={manifest.name}
    />
  );
}
