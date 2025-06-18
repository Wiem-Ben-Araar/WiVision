import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 300,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["lh3.googleusercontent.com"],
    unoptimized: true,
  },
  output: "standalone",

  // Configuration WASM
  webpack: (config, { isServer }) => {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
    }

    config.output.webassemblyModuleFilename = isServer
      ? "../static/wasm/[modulehash].wasm"
      : "static/wasm/[modulehash].wasm"

    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    })

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    }

    return config
  },

  // Headers CSP corrigés pour Vercel
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel.app",
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
    ]
  },

  async rewrites() {
    return [
      {
        source: "/_next/static/chunks/web-ifc.wasm",
        destination: "/wasm/web-ifc.wasm",
      },
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL || ""}/api/:path*`,
      },
    ]
  },
}

export default nextConfig