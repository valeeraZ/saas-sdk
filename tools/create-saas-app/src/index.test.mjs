import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";

import { createSaasApp } from "./index.mjs";

test("creates a manifest-driven standalone/integrated App without installing dependencies", async () => {
  const parent = await mkdtemp(join(tmpdir(), "create-saas-app-"));
  const target = join(parent, "risk-console");
  createSaasApp([
    "--directory",
    target,
    "--name",
    "risk-console",
    "--title",
    "Risk Console",
  ]);
  assert.ok(existsSync(join(target, "app/api/saas/health/route.ts")));
  const manifest = JSON.parse(
    readFileSync(join(target, "saas.manifest.json"), "utf8"),
  );
  assert.equal(manifest.appName, "risk-console");
  assert.equal(manifest.basePath, "/risk-console");
  assert.match(
    readFileSync(join(target, "next.config.ts"), "utf8"),
    /withSaasNextConfig/,
  );
});

test("refuses to overwrite a target or create a reserved App", async () => {
  const parent = await mkdtemp(join(tmpdir(), "create-saas-app-"));
  assert.throws(
    () =>
      createSaasApp([
        "--directory",
        parent,
        "--name",
        "risk",
        "--title",
        "Risk",
      ]),
    /already exists/,
  );
  assert.throws(
    () =>
      createSaasApp([
        "--directory",
        join(parent, "admin"),
        "--name",
        "admin",
        "--title",
        "Admin",
      ]),
    /non-reserved/,
  );
});

test("creates a dynamic application SDK adapter and isolates its asset namespace", () => {
  const temporary = mkdtempSync(join(tmpdir(), "saas-tenant-template-"));
  const directory = join(temporary, "application");
  createSaasApp([
    "--directory",
    directory,
    "--name",
    "reports",
    "--title",
    "Reports",
    "--routing",
    "portal",
  ]);
  assert.ok(
    readFileSync(join(directory, "server.mjs"), "utf8").includes(
      "createSaasAppHandler",
    ),
  );
  assert.ok(
    readFileSync(join(directory, "next.config.ts"), "utf8").includes(
      "withSaasAppNextConfig",
    ),
  );
  assert.ok(
    existsSync(
      join(directory, "app/apps/[mount]/notes/actions.ts"),
    ),
  );
  rmSync(temporary, { recursive: true, force: true });
});
