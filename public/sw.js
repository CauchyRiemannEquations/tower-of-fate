/**
 * 운명의 탑 서비스 워커 — 네트워크 우선, 실패 시 캐시.
 * 설치형 웹앱(홈 화면 추가) 요건을 채우고, 오프라인에서도
 * 마지막으로 열었던 버전이 실행되게 한다.
 */
const CACHE = 'tower-of-fate-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // 외부 리소스(폰트·Firebase)는 브라우저 기본 동작에 맡긴다
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(
          (cached) =>
            cached ??
            // SPA 네비게이션은 캐시된 진입점으로
            (request.mode === 'navigate'
              ? caches.match('/')
              : Response.error()),
        ),
      ),
  );
});
