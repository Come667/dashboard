self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}

  var title = data.title || 'My Dashboard';
  var body  = data.body  || '';
  var url   = data.url   || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body:    body,
      icon:    '/icon.svg',
      badge:   '/icon.svg',
      data:    { url: url },
      vibrate: [100, 50, 100]
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (wins) {
      for (var i = 0; i < wins.length; i++) {
        if (wins[i].url.indexOf(url) !== -1 && 'focus' in wins[i]) {
          return wins[i].focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
