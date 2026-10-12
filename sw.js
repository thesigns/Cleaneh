// Cleaneh service worker: keeps the whole app in the cache, so it works offline
// after the first load (specification 9.2).
//
// The block between the stamp markers is written by `npm run stamp`
// (tools/stamp-sw.mjs): every file of the app and a hash of their contents.
// Any change to an app file gives a new cache name, which is a new version.
// A test checks the block is up to date.

// <stamp>
const VERSION = 'c17cce98aa63';
const FILES = [
  'assets/fonts/OFL.txt',
  'assets/fonts/nunito.woff2',
  'assets/icons/app-192.png',
  'assets/icons/app-512.png',
  'assets/icons/app-maskable-192.png',
  'assets/icons/app-maskable-512.png',
  'assets/icons/app-maskable.svg',
  'assets/icons/app.svg',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/sprite.svg',
  'index.html',
  'manifest.webmanifest',
  'src/core/catalog-data.js',
  'src/core/catalog.js',
  'src/core/clean.js',
  'src/core/history.js',
  'src/core/home.js',
  'src/core/loop.js',
  'src/core/random.js',
  'src/core/scheduler.js',
  'src/core/sweep.js',
  'src/core/time.js',
  'src/data/changes.js',
  'src/data/idb.js',
  'src/data/schema.js',
  'src/data/store.js',
  'src/engine/engine.js',
  'src/engine/lock.js',
  'src/engine/start.js',
  'src/main.js',
  'src/ui/app.css',
  'src/ui/app.js',
  'src/ui/areas.js',
  'src/ui/blob.js',
  'src/ui/components.css',
  'src/ui/components.js',
  'src/ui/deck.js',
  'src/ui/dialog.js',
  'src/ui/dom.js',
  'src/ui/features.js',
  'src/ui/i18n/catalog-en.js',
  'src/ui/i18n/catalog-pl.js',
  'src/ui/i18n/en.js',
  'src/ui/i18n/index.js',
  'src/ui/i18n/pl.js',
  'src/ui/icons.js',
  'src/ui/install.js',
  'src/ui/layer.js',
  'src/ui/reward.js',
  'src/ui/rooms.js',
  'src/ui/router.js',
  'src/ui/screens.css',
  'src/ui/screens/home.js',
  'src/ui/screens/setup.js',
  'src/ui/screens/summary.js',
  'src/ui/screens/sweep.js',
  'src/ui/service-worker.js',
  'src/ui/sheet.js',
  'src/ui/sound.js',
  'src/ui/theme.css',
];
// </stamp>

const CACHE_PREFIX = 'cleaneh-';
const CACHE = CACHE_PREFIX + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      // `reload` skips the HTTP cache, so a new version never stores stale files.
      cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' }))),
    ),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

// A new version waits until the page says it is safe to switch (only when the
// app is opened, never in the middle of a series, task, sweep or big clean).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(respond(request));
});

async function respond(request) {
  const cache = await caches.open(CACHE);
  // Every page of the app is index.html.
  const key = request.mode === 'navigate' ? 'index.html' : request;
  const cached = await cache.match(key, { ignoreSearch: true });
  return cached ?? fetch(request);
}
