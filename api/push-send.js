const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var title = (req.body && req.body.title) || 'My Dashboard';
  var body  = (req.body && req.body.body)  || '';
  var url   = (req.body && req.body.url)   || '/';

  var supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  var { data: subs, error } = await supabase.from('push_subscriptions').select('*');
  if (error) return res.status(500).json({ error: error.message });
  if (!subs || subs.length === 0) return res.status(200).json({ sent: 0 });

  var payload = JSON.stringify({ title: title, body: body, url: url });

  var results = await Promise.allSettled(
    subs.map(function (sub) {
      return webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    })
  );

  var expiredEndpoints = subs
    .filter(function (_, i) {
      return results[i].status === 'rejected' &&
             results[i].reason && results[i].reason.statusCode === 410;
    })
    .map(function (s) { return s.endpoint; });

  if (expiredEndpoints.length > 0) {
    await supabase.from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints);
  }

  var sent = results.filter(function (r) { return r.status === 'fulfilled'; }).length;
  return res.status(200).json({ sent: sent, total: subs.length });
};
