const V='iron-v3',FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V&&k!=='inbox').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method==='POST'&&u.pathname.endsWith('/share-target')){
    e.respondWith((async()=>{
      try{const fd=await r.formData(),c=await caches.open('inbox');let i=0;
        for(const f of fd.getAll('audio')){await c.put(new Request(self.registration.scope+'inbox/'+(i++)+'/'+encodeURIComponent(f.name)),new Response(f,{headers:{'Content-Type':f.type||'audio/mpeg'}}))}}catch(err){}
      return Response.redirect(self.registration.scope+'index.html',303);
    })());return;
  }
  if(r.method!=='GET')return;
  if(r.mode==='navigate'||u.pathname.endsWith('/index.html')){
    e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put('./index.html',cp));return res}).catch(()=>caches.match('./index.html')));return;
  }
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>{
    if(res&&(res.ok||res.type==='opaque')&&(u.origin===location.origin||/fonts\.(googleapis|gstatic)\.com/.test(u.host))){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}
    return res}).catch(()=>caches.match('./index.html'))));
});
