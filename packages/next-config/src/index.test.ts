import assert from "node:assert/strict";
import test from "node:test";

import { withSaasNextConfig } from "./index.ts";

const manifest = {
  schemaVersion: 1 as const,
  appName: "launchpad",
  name: "Launchpad",
  description: "Release readiness",
  logo: "CircleGauge" as const,
  basePath: "/launchpad",
  healthPath: "/api/saas/health" as const,
  shellVersion: "^0.1.0",
  roles: [{ name: "developer", description: "Can use Launchpad" }],
  standaloneRoles: ["developer"],
  publicAssets: ["saas-path.svg"],
};

test("derives build-time routing from the manifest", () => {
  const config = withSaasNextConfig(manifest, {
    transpilePackages: ["@company/widgets"],
  });
  assert.equal(config.basePath, "/launchpad");
  assert.equal(config.output, "standalone");
  assert.deepEqual(config.transpilePackages, [
    "@saas-platform/sdk",
    "@saas-platform/shell",
    "@saas-platform/theme",
    "@saas-platform/ui",
    "@company/widgets",
  ]);
});

test("rejects configuration drift", () => {
  assert.throws(
    () => withSaasNextConfig(manifest, { basePath: "/wrong" }),
    /does not match/,
  );
  assert.throws(
    () => withSaasNextConfig(manifest, { assetPrefix: "/launchpad" }),
    /Do not use assetPrefix/,
  );
});

test("dynamic application config isolates assets and pins public Server Action origin", async () => {
  const { withSaasAppNextConfig } = await import("./index.ts");
  const config = withSaasAppNextConfig({
    mount: "reports",
    assetVersion: "v1",
    portalOrigin: "https://portal.test",
  });
  assert.equal(config.basePath, "");
  assert.equal(config.assetPrefix, "/app-assets/reports/v1");
  assert.deepEqual(config.experimental.serverActions.allowedOrigins, [
    "portal.test",
  ]);
  assert.equal(config.output, undefined);
  assert.throws(() =>
    withSaasAppNextConfig(
      {
        mount: "reports",
        assetVersion: "v1",
        portalOrigin: "https://portal.test",
      },
      { basePath: "/reports" },
    ),
  );
});
