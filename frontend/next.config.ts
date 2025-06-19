/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 60,
  async rewrites() {
    return [
      {
        source: '/_next/static/chunks/:path*/wasm/web-ifc.wasm', // <- catch‑all
        destination: '/wasm/web-ifc.wasm',
      },
    ];
  },
};

module.exports = nextConfig;
