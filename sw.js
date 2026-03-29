const CACHE_NAME = 'falah-porto-v2';
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


self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    // Bypass for non-GET and external requests (like API calls and external media)
    if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
        return;
    }

    e.respondWith(
        caches.match(e.request).then((res) => {
            return res || fetch(e.request).catch(() => {
                // Network failed, if it's a page navigation return the cached index
                if (e.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
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
