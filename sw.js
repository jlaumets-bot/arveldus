/* Arvik service worker — offline app shell.
   Bump VERSION whenever you change cached static assets or this file. */
const VERSION = 'v2';
const CACHE = 'arvik-' + VERSION;

/* Same-origin files precached on install. */
const SHELL = [
  '/app.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE; })
              .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;            // never touch POST/PUT/etc.

  var url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Never intercept Supabase — auth + invoice data must always be live.
  if (url.hostname.indexOf('supabase.co') !== -1) return;

  // App document / navigations: network-first, so code updates always land.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (r) {
            return r || caches.match('/app.html');
          });
        })
    );
    return;
  }

  // Static assets + CDN scripts: cache-first, fall back to network and cache it.
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
        return res;
      });
    })
  );
});
