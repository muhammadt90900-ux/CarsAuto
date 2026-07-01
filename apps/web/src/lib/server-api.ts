// apps/web/src/lib/server-api.ts
//
// F-PERF fix: server-only fetch helper for React Server Components.
//
// Why this is separate from lib/api.ts: that file's axios instance is
// configured for the BROWSER (NEXT_PUBLIC_API_URL — a public domain that
// goes through the internet/CDN/ingress, attaches client-side auth headers
// via interceptors, etc.). Server Components run on the server already —
// routing that same request back out through the public domain just to
// hit the same backend is pure waste, and in docker-compose/k8s this
// backend is reachable directly via an internal hostname anyway.
//
// INTERNAL_API_URL is a server-only env var (no NEXT_PUBLIC_ prefix — never
// sent to the browser). Falls back to NEXT_PUBLIC_API_URL so this also
// works in plain `npm run dev` without docker, where there's no separate
// "internal" network to speak of.

const API_BASE = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || '';

if (!API_BASE && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.error('[server-api] Neither INTERNAL_API_URL nor NEXT_PUBLIC_API_URL is set — server-side fetches will fail.');
}

export interface ServerFetchOptions {
  /** Next.js cache revalidation window, in seconds. Omit for no caching (always fresh). */
  revalidate?: number | false;
  /** Cache tags for on-demand revalidation via revalidateTag(). */
  tags?: string[];
  searchParams?: Record<string, string | number | boolean | undefined>;
}

/**
 * Fetches from the API server-side. Returns `null` on any failure (network
 * error, non-2xx, malformed JSON) — callers decide what "no data" means for
 * their page (usually notFound() for detail pages, an empty list for list
 * pages). Never throws, so a flaky API call can't crash an RSC render tree.
 */
export async function serverFetch<T>(path: string, options: ServerFetchOptions = {}): Promise<T | null> {
  try {
    const url = new URL(`${API_BASE}${path}`);
    if (options.searchParams) {
      for (const [key, value] of Object.entries(options.searchParams)) {
        if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      next:
        options.revalidate === false
          ? { revalidate: 0, tags: options.tags }
          : { revalidate: options.revalidate ?? 60, tags: options.tags },
    });

    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[server-api] Failed to fetch ${path}:`, err);
    return null;
  }
}
