/** @type {import('next').NextConfig} */
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig = {
  typescript: {
    // Surface3DCanvas.tsx has pre-existing @react-three/fiber JSX type issues
    ignoreBuildErrors: true,
  },
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  ...(isGitHubPages ? {
    output: "export",
    trailingSlash: true,
    images: { unoptimized: true },
    webpack: (config, { webpack }) => {
      // Replace next/headers with a no-op stub — importing it marks modules as
      // server-only which breaks output:export.
      config.resolve.alias["next/headers"] = resolve(
        __dirname,
        "./lib/next-headers-stub.ts"
      );

      // Replace Clerk's server-actions module — it contains "use server" and is
      // imported by ClerkProvider, triggering "Server Actions not supported" error.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /app-router[\\/]server-actions/,
          resolve(__dirname, "./lib/clerk-server-actions-stub.js")
        )
      );

      return config;
    },
  } : {}),
};

export default nextConfig;
