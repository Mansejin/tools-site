/* Self-destruct: kill stale caches so deploys show up. Remove after everyone updates. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) {
        if (c.url && 'navigate' in c) c.navigate(c.url);
      }
    })(),
  );
});
