// apps/web/next.config.js
const withNextIntl = require('next-intl/plugin')();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Output ─────────────────────────────────────────────────────────────────
  // 'standalone' bundles only the files needed to run the app, ideal for Docker.
  // Remove or set to undefined when deploying to Vercel (Vercel handles this).
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,

  // ── Experimental ───────────────────────────────────────────────────────────
  experimental: {
    // typedRoutes requires `strict` mode in tsconfig; disable if it causes
    // build errors in CI or on Railway/Render.
    typedRoutes: false,
    // optimizeCss requires `critters` to be installed; guard behind a flag to
    // avoid build failures when the package is absent.
    optimizeCss: process.env.OPTIMIZE_CSS === 'true',
    optimizePackageImports: ['lucide-react', '@auto-bazaar-pro/ui'],
  },

  // ── Image optimisation ─────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      // Add other image hostnames here as needed:
      // { protocol: 'https', hostname: 'images.unsplash.com' },
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

  // ── Compiler: strip console.log in production ─────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // ── Bundle analyser: run with ANALYZE=true npx next build ─────────────────
  ...(process.env.ANALYZE === 'true' && {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ...require("@next/bundle-analyzer": "^14.0.0")({ enabled: true }),
  }),

  // ── ESLint / TypeScript: don't fail the production build on warnings ────────
  // Remove these once all warnings are resolved in your codebase.
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  i18n: null, // handled by next-intl middleware
};

module.exports = withNextIntl(nextConfig);
