import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["fs", "path", "readline"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
