// src/sw.js - Service Worker for REYNAHUB offline caching
const CACHE_NAME = 'reynahub-v15';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/styles/tools.css',
  '/src/styles/design-system.css',
  '/src/styles/components.css',
  '/src/styles/hub-landing.css',
  '/src/app.js',
  '/src/core/router.js',
  '/src/core/theme-manager.js',
  '/src/components/tool-card.js'
];

const OFFLINE_HTML = '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline — REYNAHUB</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;color:#0f172a;font:16px system-ui,sans-serif;padding:24px;text-align:center}h2{font-size:1.1rem;margin:0 0 6px}p{color:#64748b;margin:0;font-size:.9rem}</style></head><body><div><h2>Sedang offline</h2><p>Modul ini belum tersimpan di perangkat. Sambungkan internet lalu muat ulang.</p></div></body></html>';

function offlineResponse() {
  return new Response(OFFLINE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Hanya aset milik sendiri; GAS/Supabase/lintas-origin ditangani browser langsung
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/Productive/') || url.pathname.startsWith('/dak/')) {
    // Network-first: tool files must reflect latest edits; cache only as offline fallback
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match(request).then((cached) => cached || offlineResponse()))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => {
        if (cached) return cached;
        return request.mode === 'navigate' ? offlineResponse() : new Response('', { status: 504 });
      });

      return cached || fetched;
    })
  );
});
