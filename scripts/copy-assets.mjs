import { readdirSync, mkdirSync, copyFileSync, chmodSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
function copy(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const source = join(directory, entry.name);
    if (entry.isDirectory()) copy(source);
    else if (source.endsWith(".css")) {
      const target = source.replace(/^src/, "dist");
      mkdirSync(dirname(target), { recursive: true }); copyFileSync(source, target);
    }
  }
}
copy("src");
const manifest = JSON.parse(readFileSync("package.json"));
for (const bin of Object.values(manifest.bin ?? {})) chmodSync(bin, 0o755);

// TypeScript rewrites runtime extensions but retains source extensions in declarations.
// Point declaration imports to .js as well, resolved by TypeScript to adjacent .d.ts.
function fixDeclarations(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) fixDeclarations(path);
    else if (path.endsWith(".d.ts")) {
      const source = readFileSync(path, "utf8");
      writeFileSync(path, source.replace(/(["'])(\.\.?\/[^"']+)\.tsx?\1/g, "$1$2.js$1"));
    }
  }
}
fixDeclarations("dist");
