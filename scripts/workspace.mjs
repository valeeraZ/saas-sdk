import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
export const packages = readdirSync("packages").filter(p => {
  try { readFileSync(`packages/${p}/package.json`); return true; } catch { return false; }
}).map(p => ({ directory: `packages/${p}`, ...JSON.parse(readFileSync(`packages/${p}/package.json`)) }));
export function run(command, args, options = {}) {
  const environment = {...process.env, NEXT_TELEMETRY_DISABLED: "1", ...options.env};
  delete environment.NODE_PATH;
  delete environment.NODE_OPTIONS;
  return execFileSync(command, args, { stdio: "inherit", ...options, env: environment });
}
export function orderedPackages() {
  const result = [], visiting = new Set(), visited = new Set();
  const byName = new Map(packages.map(p => [p.name, p]));
  function visit(p) {
    if (visited.has(p.name)) return;
    if (visiting.has(p.name)) throw new Error(`Dependency cycle: ${p.name}`);
    visiting.add(p.name);
    for (const name of Object.keys(p.dependencies ?? {})) {
      if (name.startsWith("@saas-platform/") && !byName.has(name)) throw new Error(`Missing internal dependency: ${name}`);
      if (byName.has(name)) visit(byName.get(name));
    }
    visiting.delete(p.name); visited.add(p.name); result.push(p);
  }
  packages.forEach(visit);
  return result;
}
