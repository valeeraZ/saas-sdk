import type { NextConfig } from "next";
const nextConfig: NextConfig = { basePath: "/alpha", output: "standalone", transpilePackages: ["@saas-platform/shell", "@saas-platform/spike-app", "@saas-platform/theme", "@saas-platform/ui"], experimental: { serverActions: { allowedOrigins: ["localhost:3000", "saas-platform.example.invalid"] } } };
export default nextConfig;
