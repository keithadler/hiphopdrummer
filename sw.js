// Hip Hop Drummer — Service Worker
// Caches all app assets for offline use and fast repeat loads.
// Cache-first strategy: serve from cache, update in background.

var CACHE_NAME = 'hiphopdrummer-v1';

var ASSETS = [
  '/hiphopdrummer/',
  '/hiphopdrummer/index.html',
  '/hiphopdrummer/styles.css',
  '/hiphopdrummer/patterns.js',
  '/hiphopdrummer/ai.js',
  '/hiphopdrummer/writers.js',
  '/hiphopdrummer/groove.js',
  '/hiphopdrummer/analysis.js',
  '/hiphopdrummer/ui.js',
  '/hiphopdrummer/midi-export.js',
  '/hiphopdrummer/pdf-export.js',
  '/hiphopdrummer/app.js',
  '/hiphopdrummer/icon-192.png',
  '/hiphopdrummer/icon-512.png'
];

// Install: cache all local assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: delete old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first for local assets, network-only for CDN resources
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // Let CDN requests (JSZip, jsPDF, Tone, midi-player) go straight to network
  // They're large and versioned — no benefit caching them in SW
  if (url.hostname !== self.location.hostname) {
    return; // fall through to browser default (network)
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // Serve from cache, refresh in background
        var refresh = fetch(e.request).then(function(response) {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(e.request, response.clone());
            });
          }
          return response;
        }).catch(function() {});
        return cached;
      }
      // Not in cache — fetch from network and cache it
      return fetch(e.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      });
    })
  );
});
