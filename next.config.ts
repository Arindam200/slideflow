import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in a parent directory confuses Turbopack's root
  // inference, so pin the workspace root to this project.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
