import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 300,
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
  
  // Important for Vercel WASM support
  experimental: {
    serverComponentsExternalPackages: [],
  },
  
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // WASM support
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },

  async headers() {
    return [
      // Headers globaux pour Cross-Origin Isolation (nécessaire pour WASM/SharedArrayBuffer)
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
      // Headers spécifiques pour les fichiers WASM
      {
        source: '/(.*\\.wasm)',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
      // Headers pour les ressources Supabase
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'cross-origin',
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/wasm/:path*',
        destination: '/wasm/:path*',
      },
    ];
  },
};

export default nextConfig;