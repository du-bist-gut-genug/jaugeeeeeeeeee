/* Jauge — service worker : coquille en cache, réseau pour Open Food Facts */
const CACHE = "jauge-v8";
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"
];

self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method !== "GET") return;
  const url = new URL(req.url);

  // Jamais de cache pour les API externes (Open Food Facts, fournisseur IA)
  if(url.origin !== self.location.origin) return;

  // Navigation : réseau d'abord, cache en secours (mode avion)
  if(req.mode === "navigate"){
    e.respondWith(
      fetch(req).then(r=>{
        const copy = r.clone();
        caches.open(CACHE).then(c=>c.put("./index.html", copy));
        return r;
      }).catch(()=>caches.match("./index.html"))
    );
    return;
  }

  // Ressources : cache d'abord
  e.respondWith(
    caches.match(req).then(hit=> hit || fetch(req).then(r=>{
      if(r && r.status === 200 && r.type === "basic"){
        const copy = r.clone();
        caches.open(CACHE).then(c=>c.put(req, copy));
      }
      return r;
    }).catch(()=>hit))
  );
});
