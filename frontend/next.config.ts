import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 300,
  images: {
    domains: ["lh3.googleusercontent.com"],
    unoptimized: true,
  },
  output: "standalone",

  // Configuration Webpack critique pour WASM
  webpack: (config, { isServer }) => {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };

    // Résolution des modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Configuration pour les fichiers WASM
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Assurer que les fichiers WASM sont copiés correctement
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@wasm': 'public/wasm',
      };
    }

    return config;
  },

  // Réécritures pour WASM et API
  async rewrites() {
    return [
      // Réécritures pour les fichiers WASM
      {
        source: '/wasm/:path*',
        destination: '/wasm/:path*',
      },
      // Réécritures pour l'API
      {
        source: "/api/:path*",
        destination: "https://wivision.onrender.com/api/:path*",
      },
    ];
  },

  // Headers CSP modifiés avec wasm-unsafe-eval
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.app",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https: wss: https://*.vercel.app",
              "media-src 'self'",
              "object-src 'none'",
              "child-src 'self' blob:",
              "worker-src 'self' blob:",
              "form-action 'self'",
              "base-uri 'self'",
              "frame-ancestors 'none'",
            ].join('; ')
          }
        ]
      }
    ];
  },
};

export default nextConfig;