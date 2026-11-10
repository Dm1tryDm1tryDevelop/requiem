/* AURION service worker: все пути относительные, поэтому работает под любым именем репозитория.
   Данные пользователей (localStorage, IndexedDB) он не трогает. */
const V = 'aurion-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(V)
      .then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V && k !== 'inbox').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* «Поделиться» из Telegram и других приложений: файлы кладём в кэш inbox, приложение заберёт их при открытии */
async function shareIn(r) {
  try {
    const fd = await r.formData();
    const c = await caches.open('inbox');
    for (const f of fd.getAll('files')) {
      if (!f || !f.name) continue;
      await c.put(new Request(new URL('inbox/' + encodeURIComponent(f.name), self.registration.scope).href),
        new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream' } }));
    }
  } catch (e) {}
  return Response.redirect(new URL('./', self.registration.scope).href, 303);
}

self.addEventListener('fetch', e => {
  const r = e.request;
  const u = new URL(r.url);
  if (r.method === 'POST' && u.pathname.endsWith('/share-target')) { e.respondWith(shareIn(r)); return; }
  if (r.method !== 'GET' || r.headers.has('range')) return;
  if (u.origin === location.origin) {
    // сначала сеть (чтобы обновления приходили сразу), без сети берём из кэша
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
        return res;
      }).catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error())))
    );
  } else if (/(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname)) {
    e.respondWith(
      caches.match(r).then(m => {
        const net = fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => m);
        return m || net;
      })
    );
  }
});
