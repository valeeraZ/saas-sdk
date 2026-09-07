import { readdirSync } from "node:fs";
import { run } from "./workspace.mjs";
// A fresh checkout has no .next route declarations; generate them before tsc.
for (const app of readdirSync("apps")) run("npm", ["exec", "--workspace", `apps/${app}`, "--", "next", "typegen"]);
run("npm", ["run", "typecheck", "--workspaces", "--if-present"]);
