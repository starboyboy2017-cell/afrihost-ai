/* AfriHost AI — Service Worker (PWA)
 * Correctif production v2 :
 *   - NAVIGATION (pages HTML) : NETWORK-FIRST  -> toujours la version fraîche du serveur,
 *     le cache n'est utilisé qu'en secours hors-ligne. C'était "cache-first" en v1,
 *     ce qui servait des pages obsolètes même après effacement du cache navigateur.
 *   - ASSETS STATIQUES (JS/CSS/images/manifest) : CACHE-FIRST pour la performance.
 *   - API (/api/*) : réseau uniquement, jamais mis en cache.
 *   - CACHE bumpé v1 -> v2 : purge automatique de l'ancien cache (Phase 0 obsolète).
 */
const CACHE = "afrihost-mobile-v2";
const SHELL = ["/mobile", "/portal", "/manifest.webmanifest", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API : jamais mis en cache. GET peut retomber sur /offline en secours hors-ligne.
  if (url.pathname.startsWith("/api/")) {
    if (event.request.method === "GET") {
      event.respondWith(fetch(event.request).catch(() => caches.match("/offline")));
    }
    // POST/PUT/DELETE : réseau uniquement.
    return;
  }

  // Navigation (pages HTML) : NETWORK-FIRST pour toujours servir la version fraîche.
  const isNavigation =
    event.request.mode === "navigate" ||
    event.request.headers.get("accept")?.includes("text/html");

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          // Ne mettre en cache que les réponses valides et même origine.
          if (res && res.ok && url.origin === location.origin) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(event.request).then((hit) => hit || caches.match("/offline")))
    );
    return;
  }

  // Assets statiques (même origine) : CACHE-FIRST.
  if (event.request.method === "GET") {
    event.respondWith(
      caches.match(event.request).then((hit) =>
        hit ||
        fetch(event.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
            return res;
          })
          .catch(() => caches.match("/offline"))
      )
    );
    return;
  }
});

// Synchronisation de base : au retour en ligne, rejouer les requêtes en attente.
self.addEventListener("sync", (event) => {
  if (event.tag === "afrihost-sync") {
    event.waitUntil(
      caches.open(CACHE).then((c) =>
        c.keys().then((keys) =>
          Promise.all(
            keys.map((k) => {
              if (k.url.includes("/api/mobile/sync"))
                return c.match(k).then((res) => res && fetch(k.url, { method: "POST", body: res && res.clone().text() }));
              return Promise.resolve();
            })
          )
        )
      )
    );
  }
});
