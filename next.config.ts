import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/image/**',
        search: '',
      },
      {
        pathname: '/api/thumbnail/**',
        search: '',
      }
    ]
  },
  // Enable compression for better performance
  compress: true,
  // Optimize production builds
  productionBrowserSourceMaps: false,
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'],
  }
};

export default nextConfig;
