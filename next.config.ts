import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack ignores lockfiles in parent folders.
  turbopack: { root: __dirname },
  /* config options here */
};

export default nextConfig;
