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

  // Headers CSP pour résoudre le problème
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'sha256-8bcKvbDeduRkqa/HuxGIQ8i1BX3DbPCZL6eHFmyhZZQ=' 'sha256-OBTN3RiyCV4Bq7dFqZ5a2pAXjnCcCYeTJMO2I/LYKeo=' 'sha256-NaOyxdjgPKA2N2xmLG2eb2ouGsa8+gkhmYlnSSegjIg=' 'sha256-7addXVn0RQVKV9+yi8LsJw6UwS6Gi0HQ8ALCg6Z63jo=' 'sha256-jDbYAWOyNR0emqAfeBqkWMCeh6+pT62/qCL2SbI3lHY=' 'sha256-I4hLx33ZSkaB4f6KmGXbdq6s/znqX7LczpLaVbG+PYg=' 'sha256-3QLoG1QSbzRTfQIMi7+wo8D/b5gZiHymhh5foKjHvCQ='",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https:",
              "media-src 'self'",
              "object-src 'none'",
              "child-src 'self'",
              "worker-src 'self' blob:",
              "form-action 'self'",
              "base-uri 'self'",
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