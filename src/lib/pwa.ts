/**
 * Tvinger nettleseren/PWA-en til å hente app-skallet på nytt.
 * Sletter bare service-worker-cache, ikke IndexedDB eller innlogging.
 */
export async function forceAppUpdate(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  }

  window.location.reload();
}
