// Diboraculum Hub — Service Worker v4
const CACHE_NAME = "dib-hub-v4";
const STATIC_ASSETS = ["/", "/manifest.json"];

// Routes that must NEVER be intercepted by the SW
// (OAuth flow, API calls that set cookies, etc.)
const BYPASS_PATTERNS = [
  /^\/api\/oauth\//,
  /^\/api\/trpc\//,
  /^\/api\//,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // BYPASS: Never intercept OAuth callback or API routes
  // Let the browser handle them natively so cookies are set correctly
  const shouldBypass = BYPASS_PATTERNS.some((pattern) =>
    pattern.test(url.pathname)
  );
  if (shouldBypass) return;

  // Never interfere with non-GET requests.
  if (request.method !== "GET") return;

  // Navigation must be network-first so deployments and auth redirects are
  // never shadowed by an old cached HTML shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedPage = await caches.match("/");
        return cachedPage || new Response("Offline", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        // Only cache successful GET responses for static assets
        if (
          response.ok &&
          request.method === "GET" &&
          (url.pathname.startsWith("/assets/") ||
            url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css") ||
            url.pathname.endsWith(".png") ||
            url.pathname.endsWith(".ico") ||
            url.pathname === "/" ||
            url.pathname === "/manifest.json")
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(async () => {
        return new Response("Offline", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      });
    })
  );
});
