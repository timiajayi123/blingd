import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {},
    optimizeCss: true,
    optimizePackageImports: ['framer-motion', 'lucide-react', 'sonner'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 1 day
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fra.cloud.appwrite.io",
        pathname: "/v1/storage/buckets/**/files/**/view",
      },
      {
        protocol: "https",
        hostname: "fra.cloud.appwrite.io",
        pathname: "/v1/storage/buckets/**/files/**/preview",
      },
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
        pathname: "/v1/storage/buckets/**/files/**/view",
      },
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
        pathname: "/v1/storage/buckets/**/files/**/preview",
      },
      {
        protocol: "https",
        hostname: "storage.example.com",
        pathname: "/v1/storage/buckets/**/files/**/view",
      },
      {
        protocol: "https",
        hostname: "storage.example.com",
        pathname: "/v1/storage/buckets/**/files/**/preview",
      },
      // Allow external product images from ImageKit
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      { source: '/store', destination: '/storefront' },
      { source: '/placeholder.svg', destination: '/placeholder.svg' },
      { source: '/placeholder.svg', destination: '/placeholder.svg' },
    ];
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-developer-merchantid-domain-association",
        headers: [{ key: "Content-Type", value: "application/text" }],
      },
    ];
  },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
};

export default nextConfig;
