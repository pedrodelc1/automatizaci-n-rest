/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['partly-unpaid-gazing.ngrok-free.dev'],
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
