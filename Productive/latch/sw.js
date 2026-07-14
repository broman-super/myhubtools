var CACHE = 'latch-v1';
var RUNTIME_CACHE = 'latch-runtime';

var PRECACHE = [
  '/',
  'css/style.css',
  'js/core/utils.js',
  'js/core/state.js',
  'js/core/storage.js',
  'js/core/db.js',
  'js/core/layout.js',
  'js/ui/components.js',
  'js/ui/view.js',
  'js/ui/dashboard.js',
  'js/ui/theme.js',
  'js/app.js',
  'js/db-offline.js',
  'views/public.html',
  'views/admin.html',
  'views/modals.html',
  'views/footer.html'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE && k !== RUNTIME_CACHE; })
          .map(function (k) { return caches.delete(k); })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.indexOf('chrome-extension') !== -1) return;

  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var fetched = fetch(e.request).then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(RUNTIME_CACHE).then(function (cache) {
            cache.put(e.request, copy);
          });
        }
        return response;
      }).catch(function () {
        return caches.match(e.request);
      });
      return cached || fetched;
    })
  );
});
