import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 300,
  images: {
    domains: ["lh3.googleusercontent.com"],
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Critical: Configure webpack to handle WASM files properly
  webpack: (config, { isServer, dev }) => {
    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    }

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    })

    // Copy WASM files to the correct location
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        buffer: false,
      }

      // Ensure WASM files are copied to the static directory
      config.output.webassemblyModuleFilename = "static/wasm/[modulehash].wasm"
    }

    // Handle web-ifc specifically
    config.module.rules.push({
      test: /web-ifc.*\.wasm$/,
      type: "asset/resource",
      generator: {
        filename: "static/chunks/wasm/[name][ext]",
      },
    })

    return config
  },

  async headers() {
    return [
      {
        source: "/_next/static/chunks/wasm/:path*",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/wasm/:path*",
        headers: [
          { key: "Content-Type", value: "application/wasm" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
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
}

export default nextConfig
