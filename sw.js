const CACHE_NAME = "vulture-lite-v8";
const APP_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./content.js",
  "./scheduler.js",
  "./favicon.svg",
  "./manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put("./index.html", copy);
          });
          return response;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (windows) => {
        for (const client of windows) {
          if (client.url.startsWith(self.registration.scope)) {
            await client.focus();
            client.postMessage({ type: "SHOW_BREAK" });
            return;
          }
        }
        await self.clients.openWindow(self.registration.scope);
      }),
  );
});
