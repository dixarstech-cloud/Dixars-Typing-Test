"use strict";

const CACHE_NAME = "dixars-shell-v1";
const APP_SHELL = [
  "/",
  "/enhancements.js",
  "/developer-programs.js",
  "/manifest.webmanifest",
  "/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
  )));
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") ||
      url.pathname === "/race" || event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request)));
});
