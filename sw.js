// Green AI arka plan dosyası: uygulamayı internetsiz açar, takip modellerini ilk indirmeden sonra saklar.
// Yeni sürüm yayınlarken VERSION'ı değiştir; eski önbellek silinir.
const VERSION = "greenai-v8";
const SHELL = ["./", "./index.html", "./takip.html", "./app-core.js?v=8", "./app-main.js?v=8", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];
const MODEL_HOSTS = ["cdn.jsdelivr.net", "storage.googleapis.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== "greenai-models").map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Takip modelleri ve yazı tipleri: önce önbellek (büyük dosyalar bir kez iner)
  if (MODEL_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.open("greenai-models").then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // Uygulama sayfaları: önce ağ (güncellemeler gelsin), ağ yoksa önbellek
  e.respondWith(
    fetch(req)
      .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
  );
});
