import { rmSync } from "node:fs";
import { orderedPackages, run } from "./workspace.mjs";
for (const p of orderedPackages()) {
  rmSync(`${p.directory}/dist`, { recursive: true, force: true });
  run("npm", ["run", "build", "--workspace", p.name]);
}
