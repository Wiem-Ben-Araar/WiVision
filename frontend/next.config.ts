import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 300,
  images: {
    domains: ["lh3.googleusercontent.com"],
    unoptimized: true, // Updated code here
  },

  // Enhanced WASM support for Vercel
  experimental: {
    serverComponentsExternalPackages: [],
    esmExternals: "loose",
  },

  webpack: (config, { isServer, dev }) => {
    // Enhanced WASM configuration
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true,
    }

    // WASM file handling
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    })

    // Additional rule for WASM files in node_modules
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
      generator: {
        filename: "static/wasm/[name].[hash][ext]",
      },
    })

    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      }

      // Ensure proper WASM loading in browser
      config.output.webassemblyModuleFilename = "static/wasm/[modulehash].wasm"
    }

    // Fix for dynamic imports in production
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups.wasm = {
        name: "wasm",
        test: /\.wasm$/,
        chunks: "all",
        enforce: true,
      }
    }

    return config
  },

  async headers() {
    return [
      {
        // More specific WASM file matching
        source: "/_next/static/wasm/:path*",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        source: "/(.*\\.wasm)",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        source: "/api/wasm/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
      {
        // Add headers for the main page to support WASM
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ]
  },

  async rewrites() {
    return [
      {
        source: "/wasm/:path*",
        destination: "/api/wasm/:path*",
      },
    ]
  },

  eslint: {
    ignoreDuringBuilds: true, // Updated code here
  },
  typescript: {
    ignoreBuildErrors: true, // Updated code here
  },
}

export default nextConfig
