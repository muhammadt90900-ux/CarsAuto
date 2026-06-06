/**
 * AutoBazaar Pro — Service Worker
 * Strategy:
 *   - App shell    → Cache-First (immutable Next.js static assets)
 *   - API/listings → Network-First with 5 s timeout, fallback to cache
 *   - Images       → Stale-While-Revalidate (24 h)
 *   - Pages        → Network-First, offline fallback to /offline
 */

const CACHE_VERSION = 'v1';
const CACHE_NAMES = {
  shell:    `abp-shell-${CACHE_VERSION}`,
  pages:    `abp-pages-${CACHE_VERSION}`,
  images:   `abp-images-${CACHE_VERSION}`,
  api:      `abp-api-${CACHE_VERSION}`,
  fonts:    `abp-fonts-${CACHE_VERSION}`,
};

const OFFLINE_PAGE = '/offline';
const OFFLINE_IMAGE = '/icons/icon-192x192.png';

// App shell — precached on install
const SHELL_ASSETS = [
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-144x144.png',
];

// Cache size limits
const MAX_CACHE_ENTRIES = {
  images: 60,
  api: 30,
  pages: 20,
};

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAMES.shell).then((cache) =>
      cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Shell pre-cache partial failure:', err);
      })
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const validCaches = new Set(Object.values(CACHE_NAMES));

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !validCaches.has(key))
          .map((key) => {
            console.log('[SW] Deleting stale cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ───────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin + trusted CDNs
  const isSameOrigin = url.origin === self.location.origin;
  const isCloudinary = url.hostname.includes('cloudinary.com');
  const isNextStaticCDN = url.pathname.startsWith('/_next/static/');

  if (!isSameOrigin && !isCloudinary) return;

  // Non-GET → skip (POST, WebSocket upgrades, etc.)
  if (request.method !== 'GET') return;

  // ── Next.js immutable static assets → Cache-First ──────────────────────
  if (isNextStaticCDN || url.pathname.startsWith('/fonts/')) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.shell));
    return;
  }

  // ── Icons / manifest → Cache-First ─────────────────────────────────────
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json') {
    event.respondWith(cacheFirst(request, CACHE_NAMES.shell));
    return;
  }

  // ── Images (local + Cloudinary) → Stale-While-Revalidate ───────────────
  const isImage =
    isCloudinary ||
    /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)(\?.*)?$/.test(url.pathname) ||
    url.pathname.startsWith('/_next/image');

  if (isImage) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.images, MAX_CACHE_ENTRIES.images));
    return;
  }

  // ── Internal API calls → Network-First with offline fallback ───────────
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, CACHE_NAMES.api, 5000, MAX_CACHE_ENTRIES.api));
    return;
  }

  // ── HTML page navigations → Network-First, /offline fallback ───────────
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }
});

// ─── Strategies ──────────────────────────────────────────────────────────────

/** Cache-First: return cached copy; fetch+cache if miss. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Network error', { status: 503 });
  }
}

/** Stale-While-Revalidate: serve from cache, revalidate in background. */
async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        trimCache(cache, maxEntries);
      }
      return response;
    })
    .catch(() => null);

  return cached ?? (await networkFetch) ?? new Response(null, { status: 204 });
}

/** Network-First with configurable timeout; falls back to cached. */
async function networkFirstWithTimeout(request, cacheName, timeout, maxEntries) {
  const cache = await caches.open(cacheName);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), timeout)
  );

  try {
    const response = await Promise.race([fetch(request), timeoutPromise]);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cache, maxEntries);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline', cached: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/** Navigation handler: network-first, /offline page fallback. */
async function navigationHandler(request) {
  const cache = await caches.open(CACHE_NAMES.pages);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cache, MAX_CACHE_ENTRIES.pages);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;

    // Try exact offline page first, then root cached page
    const offlinePage = await cache.match(OFFLINE_PAGE);
    if (offlinePage) return offlinePage;

    // Last resort: minimal offline HTML
    return new Response(minimalOfflineHTML(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

/** Evict oldest entries when cache exceeds maxEntries. */
async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const toDelete = keys.slice(0, keys.length - maxEntries);
  await Promise.all(toDelete.map((k) => cache.delete(k)));
}

function minimalOfflineHTML() {
  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Offline — AutoBazaar Pro</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#050b14;color:#e2e8f0;font-family:system-ui,sans-serif;
         display:flex;flex-direction:column;align-items:center;justify-content:center;
         min-height:100vh;padding:24px;text-align:center}
    .icon{font-size:64px;margin-bottom:24px}
    h1{font-size:1.5rem;color:#D4AF37;margin-bottom:12px}
    p{color:#94a3b8;max-width:360px;line-height:1.6;margin-bottom:24px}
    button{background:#D4AF37;color:#050b14;border:none;padding:12px 28px;
           border-radius:8px;font-size:1rem;font-weight:600;cursor:pointer}
  </style>
</head>
<body>
  <div class="icon">🚗</div>
  <h1>You're offline</h1>
  <p>AutoBazaar Pro needs a connection to load new listings. Previously visited pages are still available.</p>
  <button onclick="location.reload()">Try again</button>
</body>
</html>`;
}

// ─── Background Sync ─────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

async function syncFavorites() {
  try {
    const db = await openDB();
    const pending = await getAll(db, 'pendingFavorites');
    for (const item of pending) {
      await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${item.token}` },
        body: JSON.stringify({ listingId: item.listingId }),
      });
      await deleteRecord(db, 'pendingFavorites', item.id);
    }
  } catch (err) {
    console.warn('[SW] Background sync failed:', err);
  }
}

// Minimal IndexedDB helpers for background sync
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('autobazaar-sw', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('pendingFavorites', { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAll(db, store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function deleteRecord(db, store, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
  });
}

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'AutoBazaar Pro', body: event.data.text() };
  }

  const options = {
    body: data.body ?? 'New update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: data.image,
    tag: data.tag ?? 'autobazaar-notification',
    renotify: true,
    requireInteraction: false,
    data: { url: data.url ?? '/ku' },
    actions: data.actions ?? [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title ?? 'AutoBazaar Pro', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url ?? '/ku';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existing = windowClients.find((c) => c.url.includes(self.location.origin));
        if (existing) {
          existing.focus();
          return existing.navigate(url);
        }
        return clients.openWindow(url);
      })
  );
});

// ─── Message channel ─────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.payload ?? [];
    event.waitUntil(
      caches.open(CACHE_NAMES.pages).then((cache) => cache.addAll(urls))
    );
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      Promise.all(Object.values(CACHE_NAMES).map((name) => caches.delete(name)))
    );
  }
});
