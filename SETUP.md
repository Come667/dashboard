# Notification Setup Guide

Follow these steps once to activate push notifications on your iPhone and Mac.

---

## Step 1 — Create the Supabase table

1. Open [supabase.com](https://supabase.com) and sign in.
2. Open your project (`oqgbxshyhyhypejbiiie`).
3. Click **SQL Editor** in the left sidebar.
4. Paste this SQL and click **Run**:

```sql
create table push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
create policy "service role only" on push_subscriptions
  using (auth.role() = 'service_role');
```

5. Get your **Service Role Key**:
   - Go to **Project Settings → API**
   - Copy the value under **service_role** (the long secret key — NOT the anon/public key)
   - Keep this safe — you will paste it in the next step.

---

## Step 2 — Add environment variables in Vercel

1. Open your project at [vercel.com](https://vercel.com).
2. Go to **Settings → Environment Variables**.
3. Add each of these (click **Add** for each one):

| Name | Value |
|---|---|
| `VAPID_PUBLIC_KEY` | `BN6W728dsCjtLehVBa2fyGsO07iC7XZKnnNrUkQ5Gr18fz2J5FKc4aIAwa4a6-im-FOpPnQTgn1gGpqXEdY67rA` |
| `VAPID_PRIVATE_KEY` | `ijLzSheNj_otPlPifQE_cPb4uidAoa2gtAM3a8JTJ9w` |
| `VAPID_SUBJECT` | `mailto:grindwithme.contact@gmail.com` |
| `SUPABASE_URL` | `https://oqgbxshyhyhypejbiiie.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(paste the service role key from Step 1)* |

4. Make sure all 5 variables are set for **Production** (and Preview if you want).

---

## Step 3 — Push code to GitHub

Push these changes to GitHub so Vercel picks them up:

1. Open GitHub Desktop (or whatever you use).
2. Commit and push all changes to the `main` branch.
3. Vercel will automatically redeploy.

Or you can click **Redeploy** in Vercel if your code is already pushed.

---

## Step 4 — Enable notifications on your Mac

1. Open your dashboard in **Chrome or Safari** on your Mac.
2. Look for the **🔕 bell icon** in the top-right corner of the navigation bar.
3. Click it and accept the notification permission prompt that appears.
4. You should see: *"Notifications enabled! You'll get reminders at 8 PM if you haven't logged."*

The bell will turn into 🔔 to confirm it is on.

---

## Step 5 — Enable notifications on your iPhone

> iOS requires the dashboard to be added to your Home Screen before push notifications work.

1. Open **Safari** on your iPhone (must be Safari, not Chrome or Firefox).
2. Go to your dashboard URL (e.g. `https://your-project.vercel.app`).
3. Tap the **Share button** (the box with an arrow pointing up) at the bottom of the screen.
4. Scroll down and tap **Add to Home Screen**.
5. Tap **Add** in the top right corner.
6. **Open the app from your Home Screen icon** — this step is required.
7. Tap the **🔕 bell icon** in the top bar and allow notifications.

---

## How notifications work

| What triggers it | When |
|---|---|
| Water reminder | 8 PM, if you haven't logged any water that day |
| Gym reminder | 8 PM, if you haven't marked a workout done that day |
| Goals reminder | 8 PM, if you haven't added any goals for that day |
| Water goal hit | Immediately, when you reach your daily water target |
| Workout complete | Immediately, when you tap "Mark workout done" |
| All goals done | Immediately, when you check off your last goal |

---

## Troubleshooting

**Bell icon doesn't appear** — You must be on the live HTTPS site (not opening the HTML file from your computer directly). Push notifications only work over HTTPS.

**No notification on iPhone** — Make sure you opened the app from the Home Screen icon, not by typing the URL in Safari. The PWA mode is required for iOS push.

**Notifications stopped working** — Tap the bell icon again to re-subscribe. This can happen if you cleared browser data.

**"Something went wrong" when tapping bell** — Check that Vercel has all 5 environment variables set and that Supabase has the `push_subscriptions` table.
