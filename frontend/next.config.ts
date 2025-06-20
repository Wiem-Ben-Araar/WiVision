import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Configuration pour les fichiers WASM
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Règle pour les fichiers WASM
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Headers CORS pour WASM - uniquement côté client
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },
  
  // Redirection pour servir le WASM depuis public
  async rewrites() {
    return [
      {
        source: '/_next/static/chunks/wasm/:path*',
        destination: '/wasm/:path*'
      }
    ];
  },

  // Headers pour WASM
  async headers() {
    return [
      {
        source: '/wasm/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/chunks/wasm/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Configuration pour Turbopack (si vous l'utilisez)
  experimental: {
    turbo: {
      rules: {
        '*.wasm': {
          loaders: ['file-loader'],
          as: '*.wasm',
        },
      },
    },
  },
};

export default nextConfig;