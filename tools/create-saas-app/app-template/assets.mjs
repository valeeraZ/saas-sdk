import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
mkdirSync("public", { recursive: true });
writeFileSync(
  "public/pixel.png",
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
    "base64",
  ),
);
const require = createRequire(import.meta.url);
copyFileSync(
  join(
    dirname(require.resolve("next/package.json")),
    "dist/compiled/@vercel/og/Geist-Regular.ttf",
  ),
  "font.ttf",
);
