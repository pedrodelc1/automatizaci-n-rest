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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'X-XSS-Protection',          value: '1; mode=block' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            // unsafe-inline para Tailwind/React inline styles; MercadoPago necesita sus dominios
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https://res.cloudinary.com https://http2.mlstatic.com",
              "connect-src 'self' https://api.mercadopago.com https://mp-checkout-static.mlstatic.com",
              "frame-src https://www.mercadopago.com https://www.mercadopago.com.ar",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
