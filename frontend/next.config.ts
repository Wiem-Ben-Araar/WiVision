import type { NextConfig } from "next";
import { copyFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Copier automatiquement le fichier WASM au build
const copyWasmFiles = () => {
  const publicWasmDir = join(process.cwd(), 'public', 'wasm');
  const nodeModulesWasm = join(process.cwd(), 'node_modules', 'web-ifc', 'web-ifc.wasm');
  const targetWasm = join(publicWasmDir, 'web-ifc.wasm');

  if (!existsSync(publicWasmDir)) {
    mkdirSync(publicWasmDir, { recursive: true });
  }

  if (existsSync(nodeModulesWasm)) {
    copyFileSync(nodeModulesWasm, targetWasm);
    console.log('✅ web-ifc.wasm copié avec succès');
  } else {
    console.warn('⚠️ web-ifc.wasm non trouvé dans node_modules');
  }
};

// Exécuter la copie au démarrage
copyWasmFiles();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 300,
  
  images: {
    domains: ["lh3.googleusercontent.com"],
  },

  experimental: {
    serverComponentsExternalPackages: ['web-ifc'],
  },

  webpack: (config, { isServer, dev }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // Règle pour les fichiers WASM
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name][ext]'
      }
    });

    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },

  async headers() {
    return [
      {
        source: '/wasm/(.*)',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/(.*\\.wasm)',
        headers: [
          { key: 'Content-Type', value: 'application/wasm' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
      {
        source: '/api/wasm/(.*)',
        headers: [
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      // Rediriger tous les chemins WASM vers l'API
      {
        source: '/_next/static/chunks/wasm/:path*',
        destination: '/api/wasm/:path*',
      },
      {
        source: '/wasm/:path*',
        destination: '/api/wasm/:path*',
      },
      {
        source: '/static/wasm/:path*',
        destination: '/api/wasm/:path*',
      },
    ];
  },
};

export default nextConfig;