// apps/web/next.config.js
const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Output ─────────────────────────────────────────────────────────────────
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  transpilePackages: ['@auto-bazaar-pro/ui', '@auto-bazaar-pro/utils'],

  // ── Experimental ───────────────────────────────────────────────────────────
  experimental: {
    typedRoutes: false,
    optimizeCss: process.env.OPTIMIZE_CSS === 'true',
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

  // ── HTTP headers ─────────────────────────────────────────────────────────
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

  // ── Compiler ──────────────────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // ── Bundle analyser: wrap conditionally ───────────────────────────────────
  // Usage: ANALYZE=true npx next build
  // (withBundleAnalyzer is applied below, outside the config object)

  // ── ESLint / TypeScript ────────────────────────────────────────────────────
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },

  i18n: null, // handled by next-intl middleware
};

// Bundle analyser — only wraps when ANALYZE=true (package must be installed)
function withOptionalBundleAnalyzer(config) {
  if (process.env.ANALYZE !== 'true') return config;
  try {
    const withBundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
    return withBundleAnalyzer(config);
  } catch {
    console.warn('[next.config] @next/bundle-analyzer not installed — skipping');
    return config;
  }
}

module.exports = withOptionalBundleAnalyzer(withNextIntl(nextConfig));
