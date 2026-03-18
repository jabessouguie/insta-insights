// InstaInsights Service Worker
// Cache-first for static assets, network-first for API routes

const CACHE_NAME = "instainsights-v2";
const STATIC_ASSETS = ["/", "/creator/dashboard", "/manifest.json", "/icon.svg", "/offline.html"];

// Install: pre-cache static shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for everything else
self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Skip non-http(s) requests (e.g. chrome-extension://)
  if (!request.url.startsWith("http")) return;
  const url = new URL(request.url);

  // Always network-first for API routes
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ success: false, error: "Hors ligne" }), {
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Cache-first for everything else (static assets)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const toCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, toCache));
        return response;
      });
    })
  );
});
