#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const APP_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = new Set([
  "admin",
  "api",
  "app-unavailable",
  "settings",
  "_next",
]);

function parseArgs(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!argument.startsWith("--") || !args[index + 1]) continue;
    values.set(argument.slice(2), args[index + 1]);
    index += 1;
  }
  const directory = values.get("directory");
  const appName = values.get("name");
  const title = values.get("title");
  const basePath =
    values.get("base-path") ?? (appName ? `/${appName}` : undefined);
  if (!directory || !appName || !title || !basePath) {
    throw new Error(
      "Usage: create-saas-app --directory <path> --name <kebab-name> --title <title> [--base-path /path] [--routing fixed|tenant]",
    );
  }
  if (!APP_NAME_PATTERN.test(appName) || RESERVED.has(appName)) {
    throw new Error("--name must be non-reserved lowercase kebab-case");
  }
  if (basePath !== `/${appName}` || RESERVED.has(basePath.slice(1))) {
    throw new Error("--base-path must equal /<name> and must not be reserved");
  }
  if (title.trim() !== title || title.length === 0 || title.length > 120) {
    throw new Error("--title must be 1-120 trimmed characters");
  }
  const routing = values.get("routing") ?? "fixed";
  if (!["fixed", "tenant"].includes(routing))
    throw new Error("--routing must be fixed or tenant");
  if (routing === "tenant" && !/^[a-z][a-z0-9-]{0,62}$/.test(appName))
    throw new Error(
      "Tenant app name must start with a letter and be at most 63 characters",
    );
  return { directory: resolve(directory), appName, title, basePath, routing };
}

function renderDirectory(source, target, replacements) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source)) {
    const sourcePath = join(source, entry);
    const targetPath = join(target, entry);
    if (statSync(sourcePath).isDirectory()) {
      renderDirectory(sourcePath, targetPath, replacements);
      continue;
    }
    const content = readFileSync(sourcePath, "utf8");
    const rendered = Object.entries(replacements).reduce(
      (value, [token, replacement]) => value.replaceAll(token, replacement),
      content,
    );
    writeFileSync(targetPath, rendered);
  }
}

export function createSaasApp(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (existsSync(options.directory)) {
    throw new Error(`Target already exists: ${options.directory}`);
  }
  const template = resolve(
    dirname(fileURLToPath(import.meta.url)),
    options.routing === "tenant" ? "../tenant-template" : "../template",
  );
  try {
    renderDirectory(template, options.directory, {
      __APP_NAME__: options.appName,
      __APP_TITLE__: options.title,
      __BASE_PATH__: options.basePath,
    });
  } catch (error) {
    if (existsSync(options.directory))
      rmSync(options.directory, { recursive: true });
    throw error;
  }
  return options.directory;
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const directory = createSaasApp();
    console.log(`Created SAAS App at ${directory}`);
    console.log(
      "Next: install the @saas packages from your private package channel, then run npm run dev.",
    );
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Unable to create SAAS App",
    );
    process.exitCode = 1;
  }
}
