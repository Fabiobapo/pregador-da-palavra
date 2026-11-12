// Service worker mínimo da fase 1: guarda páginas visitadas para abrir sem internet.
// As fases 2 e 3 vão cachear Bíblias baixadas e sermões salvos (IndexedDB).
const CACHE = "pdp-v1";
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request)
      .then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request))
  );
});
