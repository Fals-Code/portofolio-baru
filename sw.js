const CACHE_NAME = 'falah-porto-v4';
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
    self.skipWaiting(); // Force the waiting service worker to become the active service worker.
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
            if (res) return res;

            // Cloudflare Pages / Static hosts often strip .html
            // If the request isn't found, try appending .html for clean URLs
            const url = new URL(e.request.url);
            if (e.request.mode === 'navigate' && !url.pathname.endsWith('.html') && url.pathname !== '/') {
                return caches.match(url.pathname + '.html').then(htmlRes => {
                    if (htmlRes) return htmlRes;
                    return fetchWithFallback(e.request);
                });
            }

            return fetchWithFallback(e.request);
        })
    );
});

function fetchWithFallback(request) {
    return fetch(request).catch(err => {
        // If network completely fails and it's a page navigation, return the index as a safety net
        if (request.mode === 'navigate') {
            return caches.match('/index.html');
        }
        throw err;
    });
}

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        }).then(() => {
            return self.clients.claim();
        })
    );
});
