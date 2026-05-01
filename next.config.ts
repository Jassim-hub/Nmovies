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

  // Proxy /panel to the secondary Next.js app
  async rewrites() {
    // Use environment variable for production, fallback to localhost for local development
    const panelUrl = process.env.PANEL_URL || 'http://localhost:3001';
    
    return [
      {
        source: '/panel',
        destination: `${panelUrl}/panel`,
      },
      {
        source: '/panel/:path*',
        destination: `${panelUrl}/panel/:path*`,
      },
    ];
  },
};

export default nextConfig;
