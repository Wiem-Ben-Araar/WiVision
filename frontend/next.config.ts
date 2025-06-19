// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 120, // Augmentez le timeout pour les gros builds
  images: {
    domains: ["lh3.googleusercontent.com"], 
    unoptimized: true, // Important pour Vercel
  },
  // Ajoutez la configuration de sortie standalone
  output: "standalone",
  
  // Utilisez async headers() pour les en-têtes de sécurité
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          }
        ]
      }
    ];
  },
  
  // Configuration des redirections
  async rewrites() {
    return [
      {
         source: "/_next/static/chunks/wasm/web-ifc.wasm",
        destination: '/wasm/web-ifc.wasm',
      },
      // Réécriture API relative
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
   webpack(config) {
    // Optionnel : pour que le .wasm soit réellement copié dans .next
    config.module.rules.push({
      test: /web-ifc\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/chunks/wasm/[name][ext]',
      },
    });
    return config;
  },
};

export default nextConfig;