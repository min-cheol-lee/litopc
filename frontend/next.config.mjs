/** @type {import('next').NextConfig} */
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  ...(isGitHubPages ? {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
    webpack: (config) => {
      // Replace next/headers with a no-op stub so server-only APIs are never
      // bundled during static export, preventing "Server Actions" build errors.
      config.resolve.alias["next/headers"] = resolve(
        __dirname,
        "./lib/next-headers-stub.ts"
      );
      return config;
    },
  } : {}),
};

export default nextConfig;
