
/* Service Worker for DawAI */
const CACHE_NAME = 'dawai-cache-v1';

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Tell the active service worker to take control of the page immediately.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through strategy for now to ensure online functionality
  // In a full production PWA, this would handle offline caching
  event.respondWith(fetch(event.request));
});
