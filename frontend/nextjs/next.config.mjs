/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: 'www.google.com',
      },
      {
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://dolphin-app-49eto.ondigitalocean.app/backend/:path*',
      },
    ];
  },
};

export default nextConfig;
