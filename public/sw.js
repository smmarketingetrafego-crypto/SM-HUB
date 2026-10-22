// Retired app-shell worker: clears its own caches and unregisters so installs always get the latest version.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.allSettled(names.filter((n) => n.startsWith("smhub-pwa-")).map((n) => caches.delete(n)));
      await self.clients.claim();
      const wins = await self.clients.matchAll({ type: "window" });
      await Promise.allSettled(wins.map((c) => c.navigate(c.url)));
    } finally {
      await self.registration.unregister();
    }
  })()),
);
