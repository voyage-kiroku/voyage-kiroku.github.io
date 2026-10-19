// ボヤージュ支援記録ノート（アプリ版）の Service Worker
// 画面の部品（このフォルダのファイル）を端末に保存して、圏外でも起動できるようにする。
// 記録の送受信（受付窓口への通信）や画像は保存しない。
// 画面の部品は「保存済みのものをすぐ出し、裏で最新を取り直す」ので、更新は次に開いたときに反映される。
// 保存の仕組みそのものを変えたときは CACHE の番号を上げる。

var CACHE = 'srn-shell-v1';
var FONT_CACHE = 'srn-fonts';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon-180.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE && k !== FONT_CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return; // 記録の送受信（POST）は対象外
  var url = new URL(req.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE).then(function (cache) {
        return cache.match(req, { ignoreSearch: true }).then(function (hit) {
          var fresh = fetch(req).then(function (res) {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          }).catch(function () { return hit; });
          return hit || fresh;
        });
      })
    );
    return;
  }

  // 文字のフォント（Google Fonts）は、一度読み込んだら保存して使い回す
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(function (cache) {
        return cache.match(req).then(function (hit) {
          return hit || fetch(req).then(function (res) {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          });
        });
      })
    );
  }
});
