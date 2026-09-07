import type { NextConfig } from "next";
const nextConfig: NextConfig = { basePath: "/alpha", output: "standalone", transpilePackages: ["@frame/shell", "@frame/spike-app", "@frame/theme", "@frame/ui"], experimental: { serverActions: { allowedOrigins: ["localhost:3000", "frame.com"] } } };
export default nextConfig;
