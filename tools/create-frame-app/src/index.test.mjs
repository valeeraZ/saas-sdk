import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { createFrameApp } from "./index.mjs";

test("creates a manifest-driven standalone/integrated App without installing dependencies", async () => {
  const parent = await mkdtemp(join(tmpdir(), "create-frame-app-"));
  const target = join(parent, "risk-console");
  createFrameApp([
    "--directory", target,
    "--name", "risk-console",
    "--title", "Risk Console",
  ]);
  assert.ok(existsSync(join(target, "app/api/frame/health/route.ts")));
  const manifest = JSON.parse(readFileSync(join(target, "frame.manifest.json"), "utf8"));
  assert.equal(manifest.appName, "risk-console");
  assert.equal(manifest.basePath, "/risk-console");
  assert.match(readFileSync(join(target, "next.config.ts"), "utf8"), /withFrameNextConfig/);
});

test("refuses to overwrite a target or create a reserved App", async () => {
  const parent = await mkdtemp(join(tmpdir(), "create-frame-app-"));
  assert.throws(
    () => createFrameApp(["--directory", parent, "--name", "risk", "--title", "Risk"]),
    /already exists/,
  );
  assert.throws(
    () => createFrameApp(["--directory", join(parent, "admin"), "--name", "admin", "--title", "Admin"]),
    /non-reserved/,
  );
});
