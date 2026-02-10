const CACHE="keirin-pwa-v1";
const ASSETS=["./","./index.html","./app.js","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install",(e)=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",(e)=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE?caches.delete(k):null))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",(e)=>{
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(resp=>{
    try{const url=new URL(e.request.url); if(url.origin===location.origin && e.request.method==="GET"){const copy=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy));}}
    catch(_){}
    return resp;
  }).catch(()=>cached)));
});