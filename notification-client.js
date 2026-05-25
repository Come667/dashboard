(function () {
  'use strict';

  var VAPID_PUBLIC_KEY = 'BN6W728dsCjtLehVBa2fyGsO07iC7XZKnnNrUkQ5Gr18fz2J5FKc4aIAwa4a6-im-FOpPnQTgn1gGpqXEdY67rA';

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; i++) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  function isSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  function getSubscriptionState() {
    return localStorage.getItem('notif_subscribed') === 'true';
  }

  function setSubscriptionState(val) {
    localStorage.setItem('notif_subscribed', val ? 'true' : 'false');
  }

  async function registerSW() {
    try {
      return await navigator.serviceWorker.register('/sw.js');
    } catch (e) {
      return null;
    }
  }

  async function subscribe() {
    if (!isSupported()) return { ok: false, reason: 'not-supported' };

    var permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'denied' };

    var reg = await registerSW();
    if (!reg) return { ok: false, reason: 'sw-failed' };

    await navigator.serviceWorker.ready;

    var sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    var res = await fetch('/api/push-subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subscription: sub.toJSON() })
    });

    if (res.ok) {
      setSubscriptionState(true);
      return { ok: true };
    }
    return { ok: false, reason: 'server-error' };
  }

  async function sendGoalAlert(title, body, url) {
    try {
      await fetch('/api/push-send', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title: title, body: body, url: url || '/' })
      });
    } catch (e) {}
  }

  if (isSupported()) {
    registerSW();
  }

  window.NotifClient = {
    isSupported:   isSupported,
    isSubscribed:  getSubscriptionState,
    subscribe:     subscribe,
    sendGoalAlert: sendGoalAlert
  };
})();
