import { parseSaasManifest } from "@saas-platform/manifest-schema";
import { SaasPageHeader } from "@saas-platform/shell/page-header";

import manifestJson from "../saas.manifest.json";

const manifest = parseSaasManifest(manifestJson);

export default function Page() {
  return (
    <SaasPageHeader
      breadcrumbs={[{ label: "Apps" }, { label: manifest.name }]}
      description={manifest.description}
      title={manifest.name}
    />
  );
}
