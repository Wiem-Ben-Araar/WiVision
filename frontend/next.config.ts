import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 300,
  images: {
    domains: ["lh3.googleusercontent.com"],
    unoptimized: true,
  },
  output: "standalone",

  // WebAssembly configuration
  webpack: (config) => {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Add rule to serve WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "javascript/auto",
      use: [
        {
          loader: "file-loader",
          options: {
            name: "static/wasm/[name].[hash].[ext]",
            publicPath: "/_next/",
          },
        },
      ],
    });

    return config;
  },

  // API rewrites
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://wivision.onrender.com/api/:path*",
      },
    ];
  },

  // Security headers
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
      },
      // WASM-specific headers
      {
        source: '/static/wasm/:file*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          }
        ]
      }
    ];
  },
};

export default nextConfig;