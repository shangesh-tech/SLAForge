import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the project root; a stray lockfile in the home folder confuses detection.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
