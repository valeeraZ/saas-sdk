import assert from "node:assert/strict";
import test from "node:test";

import { withFrameNextConfig } from "./index.ts";

const manifest = {
  schemaVersion: 1 as const,
  appName: "launchpad",
  name: "Launchpad",
  description: "Release readiness",
  logo: "CircleGauge" as const,
  basePath: "/launchpad",
  healthPath: "/api/frame/health" as const,
  shellVersion: "^0.1.0",
  roles: [{ name: "developer", description: "Can use Launchpad" }],
  standaloneRoles: ["developer"],
  publicAssets: ["frame-path.svg"],
};

test("derives build-time routing from the manifest", () => {
  const config = withFrameNextConfig(manifest, { transpilePackages: ["@company/widgets"] });
  assert.equal(config.basePath, "/launchpad");
  assert.equal(config.output, "standalone");
  assert.deepEqual(config.transpilePackages, [
    "@frame/sdk",
    "@frame/shell",
    "@frame/theme",
    "@frame/ui",
    "@company/widgets",
  ]);
});

test("rejects configuration drift", () => {
  assert.throws(() => withFrameNextConfig(manifest, { basePath: "/wrong" }), /does not match/);
  assert.throws(
    () => withFrameNextConfig(manifest, { assetPrefix: "/launchpad" }),
    /Do not use assetPrefix/,
  );
});
