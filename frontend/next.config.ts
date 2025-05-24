import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 60,
  async rewrites() {
    return [
      // Réécriture existante pour Web-IFC
      {
        source: '/_next/static/chunks/wasm/web-ifc.wasm',
        destination: '/wasm/web-ifc.wasm',
      },
      // Nouvelle réécriture pour votre API backend
      {
        source: '/api/:path*', 
        destination: 'http://localhost:5000/api/:path*',
      }
    ];
    
  },
};

export default nextConfig;