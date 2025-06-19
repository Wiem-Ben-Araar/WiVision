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

    // IMPORTANT: Prevent Next.js from processing WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Ignore WASM files in static processing
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
      
      // Exclude WASM from being processed by Next.js bundler
      config.module.rules.push({
        test: /\.wasm$/,
        use: {
          loader: 'file-loader',
          options: {
            publicPath: '/wasm/',
            outputPath: 'static/wasm/',
          },
        },
      });
    }

    return config;
  },

  // Empêcher Next.js de traiter les fichiers WASM comme des assets statiques
  assetPrefix: '',
  
  // Configuration pour servir les fichiers WASM correctement
  async headers() {
    return [
      // Headers pour les fichiers WASM
      {
        source: '/wasm/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
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
      // Headers CSP généraux
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.app https://unpkg.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https: wss: https://*.vercel.app https://unpkg.com",
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

  // Réécritures pour API seulement
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://wivision.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;