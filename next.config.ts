import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.jwpcdn.com" },
      { protocol: "https", hostname: "images.justwatch.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
    ],
  },
};

export default nextConfig;
