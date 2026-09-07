import assert from "node:assert/strict";
import test from "node:test";

import { framePublicAsset, loadFrameAppRuntimeConfig } from "./runtime.ts";
import { manifest } from "./test-fixture.ts";

test("integrated mode fails early without a Portal origin", () => {
  assert.throws(
    () => loadFrameAppRuntimeConfig(manifest, { FRAME_RUNTIME_MODE: "integrated" }),
    /FRAME_PORTAL_ORIGIN is required/,
  );
});

test("standalone mode does not require Portal configuration", () => {
  const config = loadFrameAppRuntimeConfig(manifest, { FRAME_RUNTIME_MODE: "standalone" });
  assert.equal(config.portalOrigin, null);
});

test("public assets are manifest-declared and base-path safe", () => {
  assert.equal(framePublicAsset(manifest, "frame-path.svg"), "/launchpad/frame-path.svg");
  assert.throws(() => framePublicAsset(manifest, "other.svg"), /not declared/);
});
