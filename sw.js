// ========== SERVICE WORKER - PWA ==========
const CACHE_NAME = 'clituspc-v33';
const OFFLINE_URL = '/offline.html';

// Files cần cache để offline
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/arcade.html',
  '/dashboard.html',
  '/styles.css',
  '/interactions.css',
  '/admin.css',
  '/mobile-ux.css',
  '/manifest.json',
  '/img/z7643593902682_1d1e5b7671cc398923d350f14dd68934.jpg',
  '/img/z7643399499088_fbf2b939d27d107fda73c5053dbb4dd0.jpg',
];

// ===== INSTALL: cache tất cả assets =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => console.warn('SW precache partial fail:', err));
    }).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE: xóa cache cũ =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH: Network First cho HTML/JS/CSS, Cache First cho images =====
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bỏ qua chrome-extension và non-http
  if (!event.request.url.startsWith('http')) return;

  // API calls: luôn bypass cache
  if (url.pathname.startsWith('/api/')) return;

  // Navigation (HTML): Network First, fallback cache, fallback offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request).then(c => c || caches.match('/offline.html')))
    );
    return;
  }

  // JS / CSS: Network First (luôn lấy mới nhất, fallback cache)
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Images & fonts: Cache First (ít thay đổi)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        return res;
      }).catch(() => new Response('', { status: 404 }));
    })
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', event => {
  let data = { title: 'Clitus PC Portfolio', body: 'Có thông báo mới!', icon: '/img/icon-192.png' };
  try { data = { ...data, ...event.data.json() }; } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/img/icon-192.png',
      badge: '/img/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: '👀 Xem ngay' },
        { action: 'close', title: '✕ Đóng' }
      ]
    })
  );
});

// Click vào notification → mở trang
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(url));
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});

// ===== BACKGROUND SYNC (gửi comment/message khi có mạng trở lại) =====
self.addEventListener('sync', event => {
  if (event.tag === 'sync-pending') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  // Đọc pending data từ IndexedDB nếu có (implement ở frontend)
  console.log('SW: Background sync triggered');
}
