import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 60,
  images: {
    domains: ["lh3.googleusercontent.com"], 
  },
  // Ajouter cette configuration pour WASM
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    // Configuration spécifique pour web-ifc
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
  async rewrites() {
    return [
      {
        source: "/_next/static/chunks/wasm/web-ifc.wasm",
        destination: "/wasm/web-ifc.wasm",
      },
      {
        source: "/api/:path*",
        destination: "https://wivision.onrender.com/api/:path*",
      },
    ];
  },
  // Ajouter cette configuration pour les headers
  async headers() {
    return [
      {
        source: '/wasm/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm',
          },
        ],
      },
    ];
  },
};

export default nextConfig;