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

  webpack: (config, { isServer }) => {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      topLevelAwait: true,
    }

    // Configuration spéciale pour web-ifc WASM
    config.output.webassemblyModuleFilename = isServer
      ? "../static/wasm/[modulehash].wasm"
      : "static/wasm/[modulehash].wasm"

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }

    return config
  },

  async rewrites() {
    return [
      // SOLUTION: Rediriger les requêtes WASM vers le bon chemin
      {
        source: "/_next/static/chunks/wasm/:path*",
        destination: "/wasm/:path*",
      },
      {
        source: "/api/:path*",
        destination: "https://wivision.onrender.com/api/:path*",
      },
    ]
  },

  async headers() {
    return [
      {
        source: "/wasm/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "application/wasm",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },
}

export default nextConfig
