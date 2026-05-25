const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendToAll(supabase, title, body, url) {
  var { data: subs } = await supabase.from('push_subscriptions').select('*');
  if (!subs || subs.length === 0) return 0;

  var payload = JSON.stringify({ title: title, body: body, url: url });

  var results = await Promise.allSettled(
    subs.map(function (sub) {
      return webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    })
  );

  var expired = subs
    .filter(function (_, i) {
      return results[i].status === 'rejected' &&
             results[i].reason && results[i].reason.statusCode === 410;
    })
    .map(function (s) { return s.endpoint; });

  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired);
  }

  return results.filter(function (r) { return r.status === 'fulfilled'; }).length;
}

module.exports = async function handler(req, res) {
  var auth = req.headers && req.headers['authorization'];
  if (process.env.CRON_SECRET && auth !== ('Bearer ' + process.env.CRON_SECRET)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  var supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  var today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });

  var { data: rows } = await supabase
    .from('app_state')
    .select('key, data')
    .in('key', ['health', 'po-coach', 'goals']);

  var stateMap = {};
  if (rows) rows.forEach(function (r) { stateMap[r.key] = r.data; });

  var sent = 0;

  var waterData  = stateMap['health'];
  var waterCount = waterData && waterData.po_water_v1 && waterData.po_water_v1.logs && waterData.po_water_v1.logs[today];
  if (!waterCount || waterCount <= 0) {
    sent += await sendToAll(supabase,
      'Drink some water',
      "You haven't logged any water today",
      '/po-water.html'
    );
  }

  var gymData = stateMap['po-coach'];
  var gymDone = gymData && gymData.po_coach_workout_done && gymData.po_coach_workout_done[today];
  if (!gymDone) {
    sent += await sendToAll(supabase,
      'Gym reminder',
      "No workout logged today — hit it or rest intentionally",
      '/gym.html'
    );
  }

  var goalsData  = stateMap['goals'];
  var todayGoals = goalsData && goalsData['goals:' + today];
  if (!Array.isArray(todayGoals) || todayGoals.length === 0) {
    sent += await sendToAll(supabase,
      'Set your goals',
      "You haven't added any goals for today",
      '/index.html'
    );
  }

  return res.status(200).json({ today: today, notificationsSent: sent });
};
