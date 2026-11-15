const CACHE_NAME='inventta3d-v53';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.json',
  './pwa.css',
  './css/tokens.css',
  './css/components.css',
  './css/shell.css',
  './css/modules/auth.css',
  './css/modules/orcamentos.css',
  './css/modules/clientes.css',
  './css/modules/impressoes.css',
  './css/print.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './fonts/dm-sans-latin-wght-normal.woff2',
  './fonts/outfit-latin-wght-normal.woff2',
  './fonts/outfit-latin-ext-wght-normal.woff2',
  './img/inventta-3d-mark.png',
  './img/logo-inventta-3d-colorido.svg',
  './img/logo-inventta-3d-escuro.svg',
  './img/logo-3d-colorido.svg',
  './img/logo-3d-escuro.svg',
  './img/logo-3d-uma-cor-grafite.svg',
  './img/logo-3d-uma-cor-papel.svg',
  './img/qrcode-instagram.png',
  './img/qrcode-pix.png',
  './templates/whatsapp-template.html',
  './config.js',
  './js/calculations.js',
  './js/modules.js',
  './js/shell.js',
  './js/app.js',
  './js/orcamentos-ui.js',
  './js/clientes.js',
  './js/impressoes.js',
  './js/envio.js',
  './js/recap.js',
  './js/theme.js',
  './js/password-toggle.js',
  './js/context-help.js',
  './js/qrcode-generator.js',
  './vendor/supabase.js'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith('precifica3d-')||key.startsWith('inventta3d-'))&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).then(response=>{
      if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));}
      return response;
    }).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}
    return response;
  })));
});
