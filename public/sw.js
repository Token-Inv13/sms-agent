const CACHE_NAME = "sms-agent-static-v13";
const RUNTIME_CACHE = "sms-agent-runtime-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.webmanifest",
  "/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type !== "notify") return;
  const title = typeof data.title === "string" ? data.title : "SMS Agent";
  const body = typeof data.body === "string" ? data.body : "";
  const url = typeof data.url === "string" ? data.url : "/messages";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  const url = event?.notification?.data?.url || "/messages";
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url && "focus" in client) {
          client.focus();
          client.navigate(url).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Never cache API calls
  if (url.pathname.startsWith("/api/")) return;

  // App-shell navigation: fallback to cached index.html when offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => (res && res.ok ? res : caches.match("/index.html")))
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Always try network first for core assets to avoid stale UI (e.g. new contacts in app.js)
  if (url.pathname === "/app.js" || url.pathname === "/styles.css" || url.pathname === "/index.html") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Runtime cache for images (including signed URLs)
  if (request.destination === "image") {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          cache.put(request, res.clone());
          return res;
        } catch {
          return cache.match(request);
        }
      })
    );
    return;
  }

  // Default: cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match("/index.html"))
    })
  );
});
