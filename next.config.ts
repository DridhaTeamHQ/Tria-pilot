import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix Windows builds when Next.js infers the wrong workspace root due to multiple lockfiles.
  // Ensures output file tracing stays within this project folder.
  outputFileTracingRoot: process.cwd(),

  // Disable ESLint during build to avoid compatibility warnings
  // ESLint is still run during development
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Image optimization configuration
  images: {
    // Enable modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    // Image sizes for smaller images like thumbnails
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Remote patterns for external images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'twrqlnyhbowrmoybmyfv.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
    ],
    // Minimize image size in production
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },
  // Enable gzip compression
  compress: true,
  // Remove X-Powered-By header for security
  poweredByHeader: false,
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  // Transpile ESM packages that Next.js can't handle by default
  transpilePackages: [
    '@radix-ui/react-id',
    '@radix-ui/react-use-callback-ref',
    '@radix-ui/react-select',
    '@radix-ui/react-use-layout-effect',
    '@radix-ui/react-use-previous',
  ],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Handle .mjs files from Radix UI
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules\/@radix-ui/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
};

export default nextConfig;
