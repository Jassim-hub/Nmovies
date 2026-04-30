import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Use remotePatterns instead of deprecated domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
    // Disable image optimization for external images
    unoptimized: true,
  },
  // Move serverComponentsExternalPackages to the correct location
  serverExternalPackages: [],

  // Add empty turbopack config to silence the warning
  turbopack: {},

  // Proxy /panel to the secondary Next.js app running on port 3001
  async rewrites() {
    return [
      {
        source: '/panel',
        destination: 'http://localhost:3001/panel',
      },
      {
        source: '/panel/:path*',
        destination: 'http://localhost:3001/panel/:path*',
      },
    ];
  },
};

export default nextConfig;
