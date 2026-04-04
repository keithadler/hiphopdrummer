// Hip Hop Drummer — Service Worker
// Caches all app assets for offline use and fast repeat loads.
// Cache-first strategy: serve from cache, update in background.
//
// ⚠️  UPDATE THIS VERSION when deploying changes to any cached file.
//     The browser only re-installs the SW when this file changes.
//     Format: hiphopdrummer-YYYYMMDD or increment the number.
var CACHE_NAME = 'hiphopdrummer-v1.21';

var ASSETS = [
  './',
  './index.html',
  './styles.css',
  './patterns.js',
  './ai.js',
  './writers.js',
  './groove.js',
  './bass.js',
  './analysis.js',
  './ui.js',
  './daw-help.js',
  './midi-export.js',
  './pdf-export.js',
  './app.js',
  './beat-history.js',
  './synth.js',
  './spessasynth_processor.min.js',
  './GeneralUserGS.sf3',
  './icon-192.png',
  './icon-512.png'
];

// CDN dependencies — cached separately so the app works offline.
var CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

// Install: cache all local + CDN assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache local assets first (must succeed), then CDN (best-effort)
      return cache.addAll(ASSETS).then(function() {
        return Promise.all(
          CDN_ASSETS.map(function(url) {
            return cache.add(url).catch(function(err) {
              console.warn('SW: failed to cache CDN asset:', url, err);
            });
          })
        );
      });
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

// Fetch: cache-first for all requests (local and CDN).
// Background refresh keeps local assets fresh; CDN assets are versioned
// so the cached copy is always correct.
self.addEventListener('fetch', function(e) {
  // Only handle GET requests — POST/PUT/etc should go straight to network
  if (e.request.method !== 'GET') return;
  // Skip non-http(s) schemes (chrome-extension://, etc.)
  if (!e.request.url.startsWith('http')) return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) {
        // Serve from cache immediately.
        // For same-origin assets, refresh the cache in the background
        // so the next load picks up any changes.
        var url = new URL(e.request.url);
        if (url.hostname === self.location.hostname) {
          fetch(e.request).then(function(response) {
            if (response && response.status === 200) {
              caches.open(CACHE_NAME).then(function(cache) {
                cache.put(e.request, response);
              });
            }
          }).catch(function() {});
        }
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
