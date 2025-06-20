import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Critical Webpack configuration for WASM
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Fix for "Module not found" errors in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Important: Enable top-level await
    config.output.ecmaVersion = 2022;

    return config;
  },

  // Simplified headers configuration
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },

  // Remove Turbopack config if not used
  // experimental: { ... },

  // Add asset prefix for production
  assetPrefix: process.env.NODE_ENV === 'production' ? '/_next' : undefined,
};

export default nextConfig;