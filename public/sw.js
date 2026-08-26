// StudyOS Service Worker — with automatic cache invalidation on new deploys
const CACHE_NAME = "studyos-v2";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
];

// Install — cache shell and skip waiting immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean ALL old caches aggressively
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Listen for version check messages from the app
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch strategy — network-first for everything
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // Skip Supabase API, realtime, and external services
  if (url.hostname.includes("supabase")) return;
  if (url.hostname.includes("razorpay")) return;
  if (url.hostname.includes("googleapis")) return;

  // For HTML pages — always go network first (never serve stale)
  if (
    request.headers.get("accept")?.includes("text/html") ||
    url.pathname === "/" ||
    !url.pathname.includes(".")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Update cache with fresh version
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Only fall back to cache if network fails
          return caches.match(request).then((cached) => {
            return cached || new Response("Offline", { status: 503 });
          });
        })
    );
    return;
  }

  // For static assets (JS, CSS, fonts, images) — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      // Return cached version immediately, update in background
      return cached || fetchPromise;
    })
  );
});
