const CACHE_NAME = 'falah-porto-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/about.html',
    '/projects.html',
    '/blog.html',
    '/contact.html',
    '/game.html',
    '/projects/rshp.html',
    '/projects/warehouse.html',
    '/assets/css/style.css',
    '/assets/js/main.js',
    '/assets/js/game.js',
    '/assets/imgs/favicon.svg',
    '/manifest.json'
];


self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
});
