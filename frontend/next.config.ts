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

    // Configuration WASM optimisée
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
      // 🎯 SOLUTION SPÉCIFIQUE: Capturer le chemin exact utilisé par web-ifc
      {
        source: "/_next/static/chunks/wasm/web-ifc.wasm",
        destination: "/wasm/web-ifc.wasm",
      },
      {
        source: "/_next/static/chunks/wasm/web-ifc-mt.wasm",
        destination: "/wasm/web-ifc-mt.wasm",
      },
      // Patterns génériques pour d'autres cas
      {
        source: "/_next/static/chunks/:path*wasm/:file*.wasm",
        destination: "/wasm/:file*.wasm",
      },
      {
        source: "/_next/static/wasm/:path*",
        destination: "/wasm/:path*",
      },
      {
        source: "/static/wasm/:path*",
        destination: "/wasm/:path*",
      },
      // Rewrite API existant
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
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ]
  },
}

export default nextConfig
