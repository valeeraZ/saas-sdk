import {
  mkdtempSync,
  realpathSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { run } from "./workspace.mjs";
const directory =
  process.env.SAAS_TENANT_CONSUMER ??
  realpathSync(mkdtempSync(join(tmpdir(), "saas-tenant-next-")));
const metadata = JSON.parse(readFileSync("artifacts/npm-pack.json"));
const dependencies = Object.fromEntries(
  metadata
    .filter(
      (p) =>
        p.name !== "@saas-platform/spike-app" && p.name !== "create-saas-app",
    )
    .map((p) => [p.name, `file:${resolve("artifacts", p.filename)}`]),
);
const bootstrap = join(directory, "scaffold");
import { mkdirSync } from "node:fs";
mkdirSync(bootstrap, { recursive: true });
const cli = metadata.find((p) => p.name === "create-saas-app");
writeFileSync(
  join(bootstrap, "package.json"),
  JSON.stringify({
    private: true,
    type: "module",
    dependencies: {
      "create-saas-app": `file:${resolve("artifacts", cli.filename)}`,
    },
  }),
);
run("npm", ["install", "--no-audit", "--no-fund"], { cwd: bootstrap });
for (const mount of ["next-reports", "next-metrics"]) {
  const app = join(directory, mount);
  run(
    join(bootstrap, "node_modules/.bin/create-saas-app"),
    [
      "--directory",
      app,
      "--name",
      mount,
      "--title",
      mount === "next-reports" ? "Next Reports" : "Next Metrics",
      "--routing",
      "tenant",
    ],
    { cwd: bootstrap },
  );
  const manifest = JSON.parse(readFileSync(join(app, "package.json")));
  manifest.dependencies = { ...manifest.dependencies, ...dependencies };
  writeFileSync(
    join(app, "package.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  run("npm", ["install", "--no-audit", "--no-fund"], { cwd: app });
  run("npm", ["run", "build"], {
    cwd: app,
    env: {
      SAAS_ASSET_VERSION: "demo1",
      SAAS_PORTAL_ORIGIN:
        process.env.SAAS_PORTAL_ORIGIN ?? "https://127.0.0.1:58999",
    },
  });
  run("npm", ["run", "typecheck"], { cwd: app });
  // Installed package paths must belong to this consumer, not the SDK checkout.
  if (
    !realpathSync(join(app, "node_modules/@saas-platform/sdk")).startsWith(
      app + "/",
    )
  )
    throw new Error("Workspace link escaped isolated consumer");
}
writeFileSync(
  "artifacts/tenant-next-consumer.json",
  JSON.stringify(
    {
      directory,
      packages: metadata.map((p) => ({ name: p.name, integrity: p.integrity })),
    },
    null,
    2,
  ) + "\n",
);
console.log("ISOLATED_TENANT_CONSUMER=" + directory);
