import type { NextConfig } from "next";

// Static export (output: "export") powers the server-less, AI-only build.
// Gated by env so the default `pnpm build` (Vercel + custom server) is unchanged.
const staticExport = process.env.NEXT_PUBLIC_STATIC === "1";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: [
    "@animal-chess/game-core",
    "@animal-chess/net-protocol",
    "@animal-chess/social-protocol",
    "@animal-chess/i18n",
    "@animal-chess/ui"
  ],
  ...(staticExport
    ? {
        output: "export",
        basePath: basePath || undefined,
        assetPrefix: basePath || undefined,
        images: { unoptimized: true },
        trailingSlash: true
      }
    : {})
};

export default nextConfig;
