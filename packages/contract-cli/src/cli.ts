#!/usr/bin/env node

import { resolve } from "node:path";

import { checkSaasApp } from "./check.ts";

const args = process.argv.slice(2);
const command = args.shift();
if (command !== "check") {
  console.error("Usage: saas-contract check <app-directory> [--require-build] [--json]");
  process.exitCode = 2;
} else {
  const directory = args.find((arg) => !arg.startsWith("-"));
  if (!directory) {
    console.error("An App directory is required");
    process.exitCode = 2;
  } else {
    try {
      const report = checkSaasApp(resolve(directory), {
        requireBuild: args.includes("--require-build"),
      });
      if (args.includes("--json")) {
        console.log(JSON.stringify(report, null, 2));
      } else if (report.errors.length === 0) {
        console.log(
          `SAAS contract passed for ${report.appName} (${report.checks.join(", ")})`,
        );
      } else {
        console.error(`SAAS contract failed for ${report.appName}:`);
        report.errors.forEach((error) => console.error(`- ${error}`));
      }
      if (report.errors.length > 0) process.exitCode = 1;
    } catch (error) {
      console.error(error instanceof Error ? error.message : "SAAS contract check failed");
      process.exitCode = 1;
    }
  }
}
