/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/auth/callback',
        has: [
          {
            type: 'query',
            key: 'error'
          }
        ],
        permanent: false,
        destination: '/auth?error=:error'
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ];
  },
  // Ensure we're using the correct hostname in production
  assetPrefix: process.env.NODE_ENV === 'production' ? 'https://hangout-production.up.railway.app' : '',
  // Allow images from Supabase storage and other sources
  images: {
    domains: [
      'kuhrmktxazqcfzawzwhw.supabase.co',
      'lh3.googleusercontent.com', // For Google profile pictures
    ],
  },
  // Disable x-powered-by header
  poweredByHeader: false,
}

module.exports = nextConfig 