/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow loading mapbox-gl CSS
  transpilePackages: ['mapbox-gl'],
};

module.exports = nextConfig;
