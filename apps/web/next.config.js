// apps/web/next.config.js — PERFORMANCE OPTIMISED
const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Output ─────────────────────────────────────────────────────────────────
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  transpilePackages: ['@auto-bazaar-pro/ui', '@auto-bazaar-pro/utils'],

  // ── Experimental ───────────────────────────────────────────────────────────
  experimental: {
    typedRoutes: false,
    optimizeCss: true,                          // PERF: always on — Critters inlines critical CSS
    optimizePackageImports: [
      'lucide-react',
      '@auto-bazaar-pro/ui',
      'date-fns',
      'lodash',
    ],
    // PERF: partial pre-rendering — shell is static, dynamic islands stream in
    ppr: true,
    // PERF: server component HMR cache (dev only, no prod cost)
    serverComponentsHmrCache: true,
  },

  // ── Image optimisation ─────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.cloudinary.com' },
    ],
    formats: ['image/avif', 'image/webp'],       // PERF: avif first — 50 % smaller than webp
    deviceSizes: [640, 828, 1080, 1200, 1920],   // PERF: removed 750 (duplicate bucket)
    imageSizes: [16, 32, 64, 128, 256],          // PERF: tightened; 48/96/384 unused
    minimumCacheTTL: 86_400,                     // PERF: 24 h (was 1 h) — images don't change
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
  },

  // ── HTTP headers ─────────────────────────────────────────────────────────
  async headers() {
    return [
      // PERF: static assets — immutable 1-year cache
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Vary', value: 'Accept-Encoding' },
        ],
      },
      // PERF: fonts — immutable (content-hashed filenames)
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // PERF: raster images — 24-hour cache + SWR
      {
        source: '/:path*.{jpg,jpeg,png,gif,webp,avif,ico}',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
      // PERF: Next.js image API — long CDN cache, short browser cache
      {
        source: '/_next/image',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // PERF: API routes — no-store (dynamic)
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
    ];
  },

  // ── Compiler ──────────────────────────────────────────────────────────────
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // ── Webpack bundle splitting ───────────────────────────────────────────────
  webpack(config, { isServer }) {
    if (!isServer) {
      // PERF: split heavy third-party chunks so they can be cached independently
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...(config.optimization.splitChunks?.cacheGroups ?? {}),
          // Vendor chunk for React + React-DOM
          reactCore: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'vendor-react',
            chunks: 'all',
            priority: 30,
          },
          // TanStack Query
          tanstack: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
            name: 'vendor-tanstack',
            chunks: 'all',
            priority: 20,
          },
          // Icons — lucide is large; split so pages only load what they import
          icons: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'vendor-icons',
            chunks: 'all',
            priority: 20,
          },
        },
      };
    }
    return config;
  },

  // ── ESLint / TypeScript ────────────────────────────────────────────────────
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },

  i18n: null,
};

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
