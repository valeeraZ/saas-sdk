import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { checkFrameApp } from "./check.ts";

const manifest = {
  schemaVersion: 1,
  appName: "test-app",
  name: "Test App",
  description: "Contract fixture",
  logo: "Boxes",
  basePath: "/test-app",
  healthPath: "/api/frame/health",
  shellVersion: "^0.1.0",
  roles: [{ name: "viewer", description: "Can view" }],
  standaloneRoles: ["viewer"],
  publicAssets: ["logo.svg"],
};

async function fixture(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "frame-contract-"));
  mkdirSync(join(directory, "app/api/frame/health"), { recursive: true });
  mkdirSync(join(directory, "public"));
  writeFileSync(join(directory, "frame.manifest.json"), JSON.stringify(manifest));
  writeFileSync(join(directory, "next.config.ts"), "withFrameNextConfig(manifest)");
  writeFileSync(join(directory, "app/api/frame/health/route.ts"), "export function GET() {};");
  writeFileSync(join(directory, "public/logo.svg"), "<svg></svg>");
  writeFileSync(join(directory, "app/page.tsx"), "export default () => <img src=\"/test-app/logo.svg\" />");
  return directory;
}

test("passes a source-safe App contract", async () => {
  const report = checkFrameApp(await fixture());
  assert.deepEqual(report.errors, []);
  assert.ok(report.checks.includes("source-assets"));
});

test("detects root-relative child-App public assets", async () => {
  const directory = await fixture();
  writeFileSync(join(directory, "app/page.tsx"), "export default () => <Image src=\"/logo.svg\" />");
  const report = checkFrameApp(directory);
  assert.match(report.errors[0] ?? "", /escapes \/test-app/);
});
