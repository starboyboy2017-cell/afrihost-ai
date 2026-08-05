/* AfriHost AI — Plateforme Mobile (PWA avancée)
 * Service worker offline-first :
 *   - cache-first pour le shell de l'app (routes, assets statiques) ;
 *   - toujours réseau pour les API ;
 *   - gestion de la synchronisation de base (POST mis en file de retry).
 */
const CACHE = "afrihost-mobile-v1";
const SHELL = ["/mobile", "/portal", "/manifest.webmanifest", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // API : toujours réseau (jamais mis en cache). GET peut retomber sur le shell en offline.
  if (url.pathname.startsWith("/api/")) {
    if (event.request.method === "GET") {
      event.respondWith(
        fetch(event.request).catch(() => caches.match("/offline"))
      );
    }
    // Les méthodes non-GET (POST/PUT/DELETE) passent au réseau, sinon échouent proprement.
    return;
  }
  event.respondWith(
    caches.match(event.request).then((hit) => hit || fetch(event.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(event.request, copy));
      return res;
    }).catch(() => caches.match("/offline")))
  );
});

// Synchronisation de base : au retour en ligne, rejouer les requêtes en attente.
self.addEventListener("sync", (event) => {
  if (event.tag === "afrihost-sync") {
    event.waitUntil(
      caches.open(CACHE).then((c) => c.keys().then((keys) =>
        Promise.all(keys.map((k) => {
          if (k.url.includes("/api/mobile/sync")) return c.match(k).then((res) => res && fetch(k.url, { method: "POST", body: res && res.clone().text() }));
          return Promise.resolve();
        }))
      ))
    );
  }
});
