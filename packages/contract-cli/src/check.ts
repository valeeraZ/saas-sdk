import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import {
  parseFrameManifest,
  type FrameAppManifest,
} from "@frame/manifest-schema";

export type FrameContractReport = Readonly<{
  appName: string;
  basePath: string;
  checks: readonly string[];
  errors: readonly string[];
}>;

const SOURCE_EXTENSIONS = new Set([".css", ".js", ".jsx", ".ts", ".tsx"]);
const SKIP_DIRECTORIES = new Set([".git", ".next", "node_modules"]);

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const output: string[] = [];
  for (const entry of readdirSync(directory)) {
    if (SKIP_DIRECTORIES.has(entry)) continue;
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) output.push(...walk(path));
    else output.push(path);
  }
  return output;
}

export function readFrameManifestFile(path: string): FrameAppManifest {
  return parseFrameManifest(JSON.parse(readFileSync(path, "utf8")) as unknown);
}

function extension(path: string): string {
  const index = path.lastIndexOf(".");
  return index < 0 ? "" : path.slice(index);
}

function checkSourceAssets(appDirectory: string, manifest: FrameAppManifest): string[] {
  const errors: string[] = [];
  const basePathName = manifest.basePath.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const jsxAsset = new RegExp(
    `<(?:img|Image)\\b[^>]*\\bsrc\\s*=\\s*["']/(?!${basePathName}(?:/|["']))`,
    "g",
  );
  const cssAsset = new RegExp(`url\\(\\s*["']?/(?!${basePathName}/|/)`, "g");
  for (const path of walk(appDirectory)) {
    if (!SOURCE_EXTENSIONS.has(extension(path))) continue;
    const source = readFileSync(path, "utf8");
    if (jsxAsset.test(source) || cssAsset.test(source)) {
      errors.push(
        `${relative(appDirectory, path)} contains a root-relative asset that escapes ${manifest.basePath}`,
      );
    }
    jsxAsset.lastIndex = 0;
    cssAsset.lastIndex = 0;
  }
  return errors;
}

function checkBuild(appDirectory: string, manifest: FrameAppManifest): string[] {
  const errors: string[] = [];
  const nextDirectory = join(appDirectory, ".next");
  const routesManifest = join(nextDirectory, "routes-manifest.json");
  const requiredFiles = join(nextDirectory, "required-server-files.json");
  if (!existsSync(join(nextDirectory, "static"))) {
    return ["production build is missing .next/static"];
  }
  if (!existsSync(routesManifest) || !existsSync(requiredFiles)) {
    return ["production build is missing Next.js routing manifests"];
  }
  const routes = JSON.parse(readFileSync(routesManifest, "utf8")) as Record<string, unknown>;
  const required = JSON.parse(readFileSync(requiredFiles, "utf8")) as {
    config?: { basePath?: unknown };
  };
  if (routes.basePath !== manifest.basePath) {
    errors.push("routes-manifest basePath does not match the FRAME manifest");
  }
  if (required.config?.basePath !== manifest.basePath) {
    errors.push("required-server-files basePath does not match the FRAME manifest");
  }
  return errors;
}

export function checkFrameApp(
  appDirectoryInput: string,
  options: Readonly<{ requireBuild?: boolean }> = {},
): FrameContractReport {
  const appDirectory = resolve(appDirectoryInput);
  const manifestPath = join(appDirectory, "frame.manifest.json");
  const manifest = readFrameManifestFile(manifestPath);
  const errors: string[] = [];
  const checks: string[] = ["manifest"];

  const nextConfigPath = ["next.config.ts", "next.config.mjs", "next.config.js"]
    .map((name) => join(appDirectory, name))
    .find(existsSync);
  if (!nextConfigPath) {
    errors.push("Next.js configuration is missing");
  } else {
    const nextConfig = readFileSync(nextConfigPath, "utf8");
    if (!nextConfig.includes("withFrameNextConfig")) {
      errors.push("Next.js configuration must use withFrameNextConfig");
    } else {
      checks.push("next-config");
    }
  }

  const healthRoute = join(appDirectory, "app/api/frame/health/route.ts");
  if (!existsSync(healthRoute)) errors.push(`health route ${manifest.healthPath} is missing`);
  else checks.push("health");

  for (const asset of manifest.publicAssets) {
    if (!existsSync(join(appDirectory, "public", asset))) {
      errors.push(`declared public asset ${asset} is missing`);
    }
  }
  if (manifest.publicAssets.length > 0 && !errors.some((error) => error.includes("public asset"))) {
    checks.push("public-assets");
  }

  errors.push(...checkSourceAssets(appDirectory, manifest));
  if (!errors.some((error) => error.includes("root-relative asset"))) checks.push("source-assets");

  if (options.requireBuild) {
    const buildErrors = checkBuild(appDirectory, manifest);
    errors.push(...buildErrors);
    if (buildErrors.length === 0) checks.push("production-build");
  }

  return Object.freeze({
    appName: manifest.appName,
    basePath: manifest.basePath,
    checks: Object.freeze(checks),
    errors: Object.freeze(errors),
  });
}
