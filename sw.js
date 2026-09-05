const CACHE_NAME = 'financas-app-v4'; // Versão atualizada para v4

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png'
];

// Recurso externo usado para gerar o PDF do relatório. Fica em lista separada
// porque, se o cache dele falhar (ex.: sem internet na primeira instalação),
// isso não pode derrubar o cache dos arquivos essenciais do app.
const CDN_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Instalação: guarda os ficheiros essenciais no cache; tenta cachear o jsPDF
// também, mas sem bloquear a instalação caso essa parte falhe.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CORE_ASSETS);
      try {
        await cache.addAll(CDN_ASSETS);
      } catch (err) {
        console.warn('Não foi possível pré-cachear recursos externos (jsPDF). Será buscado na rede quando necessário.', err);
      }
    })
  );
  self.skipWaiting();
});

// Ativação: limpa caches antigos (v1, v2, v3...)
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: serve do cache se existir; senão busca na rede e guarda a resposta
// no cache para uso offline nas próximas vezes (cobre o jsPDF também).
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
