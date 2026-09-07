#!/usr/bin/env node

import { resolve } from "node:path";

import { checkFrameApp } from "./check.ts";

const args = process.argv.slice(2);
const command = args.shift();
if (command !== "check") {
  console.error("Usage: frame-contract check <app-directory> [--require-build] [--json]");
  process.exitCode = 2;
} else {
  const directory = args.find((arg) => !arg.startsWith("-"));
  if (!directory) {
    console.error("An App directory is required");
    process.exitCode = 2;
  } else {
    try {
      const report = checkFrameApp(resolve(directory), {
        requireBuild: args.includes("--require-build"),
      });
      if (args.includes("--json")) {
        console.log(JSON.stringify(report, null, 2));
      } else if (report.errors.length === 0) {
        console.log(
          `FRAME contract passed for ${report.appName} (${report.checks.join(", ")})`,
        );
      } else {
        console.error(`FRAME contract failed for ${report.appName}:`);
        report.errors.forEach((error) => console.error(`- ${error}`));
      }
      if (report.errors.length > 0) process.exitCode = 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : "FRAME contract check failed");
      process.exitCode = 1;
    }
  }
}
