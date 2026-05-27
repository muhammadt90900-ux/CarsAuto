// apps/web/next.config.js
const withNextIntl = require('next-intl/plugin')();

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true,
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@auto-bazaar-pro/ui'],
  },

  // ── Image optimisation ─────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: false,
  },

  // ── HTTP headers: cache static assets aggressively ─────────────────────────
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*.{jpg,jpeg,png,svg,gif,webp,avif,ico}',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
    ];
  },

  // ── Compiler: remove console.log in production ─────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // ── Bundle analyser: run with ANALYZE=true next build ─────────────────────
  ...(process.env.ANALYZE === 'true' && {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ...require('@next/bundle-analyzer')({ enabled: true }),
  }),

  i18n: null, // handled by next-intl middleware
};

module.exports = withNextIntl(nextConfig);
