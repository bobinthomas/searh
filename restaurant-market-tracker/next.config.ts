import path from "node:path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  // The parent directory has its own lockfile, which makes Next guess the
  // wrong workspace root. Pin it to this project instead.
  turbopack: {
    root: __dirname,
  },
};

// Makes Cloudflare bindings (the D1 database) available while running `next dev`.
initOpenNextCloudflareForDev();

export default nextConfig;
