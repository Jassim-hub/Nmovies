import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/panel',
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
