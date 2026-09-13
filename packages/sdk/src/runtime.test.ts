import assert from "node:assert/strict";
import test from "node:test";

import { saasPublicAsset, loadSaasAppRuntimeConfig } from "./runtime.ts";
import { manifest } from "./test-fixture.ts";

test("integrated mode fails early without a Portal origin", () => {
  assert.throws(
    () => loadSaasAppRuntimeConfig(manifest, { SAAS_RUNTIME_MODE: "integrated" }),
    /SAAS_PORTAL_ORIGIN is required/,
  );
});

test("standalone mode does not require Portal configuration", () => {
  const config = loadSaasAppRuntimeConfig(manifest, { SAAS_RUNTIME_MODE: "standalone" });
  assert.equal(config.portalOrigin, null);
});

test("public assets are manifest-declared and base-path safe", () => {
  assert.equal(saasPublicAsset(manifest, "saas-path.svg"), "/launchpad/saas-path.svg");
  assert.throws(() => saasPublicAsset(manifest, "other.svg"), /not declared/);
});
