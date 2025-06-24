import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 60,
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
  webpack: (config) => {
    // WebAssembly configuration
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
   
    // WASM file handling
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
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; connect-src 'self' https: wss: ws:; worker-src 'self' blob:; child-src 'self' blob:; font-src 'self' data: https://fonts.gstatic.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'"
          }
        ]
      },
      {
        // Serve WASM files with correct MIME type
        source: "/wasm/:path*.wasm",
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
      // Redirect all WASM requests to public/wasm directory
      {
        source: "/_next/static/chunks/wasm/:path*",
        destination: "/wasm/:path*",
      },
      {
        source: "/_next/static/chunks/app/viewer/wasm/:path*",
        destination: "/wasm/:path*",
      },
      // API rewrites
      {
        source: "/api/:path*",
        destination: "https://wivision.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;