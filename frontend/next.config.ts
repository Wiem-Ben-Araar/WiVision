/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  staticPageGenerationTimeout: 60,
  async rewrites() {
    return [
          {
        source: '/_next/static/chunks/wasm/:path*',
        destination: '/wasm/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
