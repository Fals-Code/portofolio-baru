const CACHE_NAME = 'falah-porto-v6';
const ASSETS = [
    '/',
    '/index.html',
    '/about.html',
    '/projects.html',
    '/blog.html',
    '/blog-detail.html',
    '/contact.html',
    '/game.html',
    '/projects/rshp.html',
    '/projects/warehouse.html',
    '/assets/css/style.css',
    '/assets/js/main.js',
    '/assets/js/chatbot.js',
    '/assets/js/music.js',
    '/assets/js/game3d.js',
    '/assets/imgs/favicon.svg',
    '/manifest.json'
];

// 1. Install & Caching
self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Menggunakan map agar jika satu file gagal, yang lain tetap masuk cache
            return Promise.allSettled(ASSETS.map(url => cache.add(url)));
        })
    );
});

// 2. Activate & Cleanup (Hapus Cache Lama)
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch Strategy: NETWORK FIRST
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
        return;
    }

    e.respondWith(
        fetch(e.request)
            .then((response) => {
                // Jika sukses dari internet, simpan/update di cache
                const resClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(e.request, resClone);
                });
                return response;
            })
            .catch(() => {
                // Jika internet GAGAL (Offline), cari di Cache
                return caches.match(e.request).then((res) => {
                    if (res) return res;

                    // Fallback khusus untuk navigasi halaman (.html)
                    if (e.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
