import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 60,
  images: {
    domains: ["lh3.googleusercontent.com"], 
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
};

export default nextConfig;
