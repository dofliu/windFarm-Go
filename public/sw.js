// 離岸風場・運維傳說 — Service Worker (PWA 階段 1，手寫、零相依)
// 策略:導覽 network-first(離線退回 app shell);同源資產 stale-while-revalidate;
//      跨來源(Apps Script 雲端 API / Google Fonts)與非 GET 一律走網路、不快取。
const CACHE = "wfg-cache-v5"; // 版本號隨改動遞增 → activate 會清掉舊版快取(含過期 app shell),避免更新後空白
const START = new URL(".", self.registration.scope).href; // app 進入點(隨 base 自動正確)

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([START]).catch(() => {})));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // 寫入/雲端 API 不快取
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 跨來源(雲端後端/字型)走網路

  if (req.mode === "navigate") {
    // 導覽:優先網路(取最新),離線時退回快取的 app shell → 可離線開啟
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        (await caches.open(CACHE)).put(req, net.clone());
        return net;
      } catch {
        return (await caches.match(req)) || (await caches.match(START)) || Response.error();
      }
    })());
    return;
  }

  // 同源資產(JS/CSS/圖片/影片):stale-while-revalidate(先回快取、背景更新)
  e.respondWith((async () => {
    const cached = await caches.match(req);
    const fetching = fetch(req)
      .then((net) => { if (net && net.ok) caches.open(CACHE).then((c) => c.put(req, net.clone())); return net; })
      .catch(() => null);
    return cached || (await fetching) || Response.error();
  })());
});
