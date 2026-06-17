import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  transpilePackages: ["@animal-chess/game-core", "@animal-chess/net-protocol"]
};

export default nextConfig;
