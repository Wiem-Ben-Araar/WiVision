import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 60,
  async rewrites() {
    return [
      {
        source: '/_next/static/chunks/wasm/web-ifc.wasm', // Chemin demandé par Web-IFC
        destination: '/wasm/web-ifc.wasm', // Fichier réellement présent dans public/wasm/
      },
    ];
  },
};

export default nextConfig;
