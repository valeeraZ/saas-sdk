import assert from "node:assert/strict";
import test from "node:test";

import { FrameManifestError, parseFrameManifest } from "./index.ts";

const validManifest = {
  schemaVersion: 1,
  appName: "launchpad",
  name: "Launchpad",
  description: "Release readiness",
  logo: "CircleGauge",
  basePath: "/launchpad",
  healthPath: "/api/frame/health",
  shellVersion: "^0.1.0",
  roles: [{ name: "developer", description: "Can use Launchpad" }],
  standaloneRoles: ["developer"],
  publicAssets: ["frame-path.svg"],
};

test("parses and freezes a valid manifest", () => {
  const manifest = parseFrameManifest(validManifest);
  assert.equal(manifest.basePath, "/launchpad");
  assert.ok(Object.isFrozen(manifest));
  assert.ok(Object.isFrozen(manifest.roles));
});

test("rejects reserved paths, undeclared standalone roles, and root-relative assets", () => {
  assert.throws(
    () =>
      parseFrameManifest({
        ...validManifest,
        basePath: "/admin",
        standaloneRoles: ["admin"],
        publicAssets: ["/logo.svg"],
      }),
    (error: unknown) => {
      assert.ok(error instanceof FrameManifestError);
      assert.equal(error.issues.length, 3);
      return true;
    },
  );
});

test("rejects server-only and unknown fields", () => {
  assert.throws(
    () => parseFrameManifest({ ...validManifest, frontendTarget: "http://internal" }),
    /unknown fields: frontendTarget/,
  );
});
