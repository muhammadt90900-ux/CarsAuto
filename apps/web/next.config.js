// apps/web/next.config.js — PERFORMANCE OPTIMISED
const path = require('path');
const withNextIntl = require('next-intl/plugin')('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Output ────────────────────────────────────────────────────────────────
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  transpilePackages: ['@auto-bazaar-pro/ui', '@auto-bazaar-pro/utils'],

  // ── Turbopack root  (monorepo Docker fix) ─────────────────────────────────
  // Turbopack needs to know the monorepo root so it can find node_modules
  // In Docker the build context is /app (root) and the app is at /app/apps/web
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },

  // ── Typed Routes (top-level in Next.js 16) ────────────────────────────────
  typedRoutes: false,

  // ── Experimental ─────────────────────────────────────────────────────────
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@auto-bazaar-pro/ui',
      'date-fns',
      'lodash',
    ],
  },

  // ── Image optimisation ────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.cloudinary.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 64, 128, 256],
    minimumCacheTTL: 86_400,
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
  },

  // ── HTTP headers ──────────────────────────────────────────────────────────
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';

    return [
      // Security headers — always applied
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options',        value: 'DENY' },
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },

      // Static & image cache — production only (breaks HMR in dev)
      ...(isProd
        ? [
            {
              source: '/_next/static/:path*',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                { key: 'Vary',          value: 'Accept-Encoding' },
              ],
            },
            {
              source: '/_next/image',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
              ],
            },
          ]
        : []),

      // These are safe in both dev and prod
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/:path*.{jpg,jpeg,png,gif,webp,avif,ico}',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=3600' }],
      },
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',        value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=3600' },
          { key: 'Content-Type',  value: 'application/manifest+json' },
        ],
      },
      {
        source: '/offline',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },

  // ── Compiler ──────────────────────────────────────────────────────────────
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },

  // ── Webpack bundle splitting ───────────────────────────────────────────────
  webpack(config, { isServer }) {
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...(config.optimization.splitChunks?.cacheGroups ?? {}),
          reactCore: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'vendor-react',
            chunks: 'all',
            priority: 30,
          },
          tanstack: {
            test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
            name: 'vendor-tanstack',
            chunks: 'all',
            priority: 20,
          },
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

  // ── TypeScript ────────────────────────────────────────────────────────────
  typescript: { ignoreBuildErrors: false },
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