/* ግብርና አስተዳደር ሲስተም — Service Worker
   ስልት፦ መተግበሪያው ሲከፈት ወዲያውኑ ከመሸጎጫ (cache) ይጫናል (ኦፍላይንም ይሰራል)፤
   ኢንተርኔት ካለ ደግሞ ከጀርባ አዲሱን ቅጂ አውርዶ ለሚቀጥለው ጊዜ ያድሳል።
   ማሳሰቢያ፦ የተጠቃሚው መረጃ (localStorage/IndexedDB) በዚህ ፋይል አይነካም።
   አዲስ ስሪት ሲለቀቅ VERSION ቁጥሩን ብቻ ይቀይሩ። */
const VERSION = 'v1.0.0';
const CACHE = 'agri-mgmt-' + VERSION;
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('agri-mgmt-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!/^https?:$/.test(url.protocol)) return;

  // ገጽ መክፈቻ (navigation)፦ መሸጎጫ መጀመሪያ፣ ከዚያ ኔትወርክ፣ በመጨረሻ index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put('./index.html', res.clone()));
          return res;
        }).catch(() => null);
        return cached || network.then((r) => r || caches.match('./'));
      })
    );
    return;
  }

  // ሌሎች ፋይሎች (ተመሳሳይ ድረ-ገጽ)፦ stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
  }
  // ከሌላ ድረ-ገጽ የሚመጡ ጥያቄዎች በአሳሹ በራሱ ይስተናገዳሉ
});
