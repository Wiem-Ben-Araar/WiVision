import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 60,
  images: {
    domains: ["lh3.googleusercontent.com"], 
  },
  webpack: (config) => {
    // Ajouter la configuration WebAssembly
    config.experiments = { 
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // Règle pour les fichiers WASM
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name][ext]'
      }
    });
    
    return config;
  },
  async headers() {
    return [
      {
        source: "/wasm/web-ifc.wasm",
        headers: [
          { 
            key: "Content-Type", 
            value: "application/wasm" 
          }
        ]
      },
      {
        source: "/_next/static/chunks/app/viewer/wasm/web-ifc.wasm",
        headers: [
          { 
            key: "Content-Type", 
            value: "application/wasm" 
          }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: "/_next/static/chunks/wasm/web-ifc.wasm",
        destination: "/wasm/web-ifc.wasm",
      },
      {
        source: "/_next/static/chunks/app/viewer/wasm/web-ifc.wasm",
        destination: "/wasm/web-ifc.wasm",
      },
      {
        source: "/api/:path*",
        destination: "https://wivision.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;