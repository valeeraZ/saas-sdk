export const manifest = {
  schemaVersion: 1 as const,
  appName: "launchpad",
  name: "Launchpad",
  description: "Release readiness",
  logo: "CircleGauge" as const,
  basePath: "/launchpad",
  healthPath: "/api/saas/health" as const,
  shellVersion: "^0.1.0",
  roles: [{ name: "developer", description: "Can use Launchpad" }],
  standaloneRoles: ["developer"],
  publicAssets: ["saas-path.svg"],
};
