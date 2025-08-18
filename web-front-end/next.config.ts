import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_WEBSOCKET_URL:
      process.env.NODE_ENV === "production"
        ? "wss://your-production-websocket-url.com"
        : "ws://localhost:4000",
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NODE_ENV === "production"
        ? "https://your-production-backend-url.com"
        : "http://localhost:4000",
  },
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
    ],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: "all",
      minChunks: 2,
    };
    return config;
  },
  swcMinify: false, // 난독화 여부
};

module.exports = nextConfig;
