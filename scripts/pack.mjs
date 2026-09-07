import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { orderedPackages, run } from "./workspace.mjs";
mkdirSync("artifacts", { recursive: true });
const results = [];
for (const p of [...orderedPackages(), {directory: "tools/create-frame-app"}]) {
  const output = run("npm", ["pack", "--json", "--pack-destination", resolve("artifacts")], {cwd: p.directory, stdio: "pipe"});
  const [metadata] = JSON.parse(output.toString());
  results.push(metadata); console.log(`${metadata.filename}: ${metadata.files.length} files`);
}
writeFileSync("artifacts/npm-pack.json", JSON.stringify(results, null, 2) + "\n");
