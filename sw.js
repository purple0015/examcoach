// Minimal service worker placeholder — next-pwa generates the production SW
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
