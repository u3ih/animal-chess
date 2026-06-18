import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@animal-chess/game-core", "@animal-chess/net-protocol", "@animal-chess/i18n", "@animal-chess/ui"]
};

export default nextConfig;
