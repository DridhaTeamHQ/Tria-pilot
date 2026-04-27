# Railway Deployment — Try-On Worker

Deploy the BullMQ worker on Railway so it processes try-on jobs queued by your
Vercel-hosted Next.js app. Skip QStash entirely.

## Architecture

```
   ┌─────────────────────┐
   │     Vercel          │
   │  (Next.js app)      │  POST /api/tryon → enqueue
   │                     │ ─────────────────────────┐
   └──────────▲──────────┘                          │
              │ poll /api/tryon/jobs/[id]           │
              │                                     ▼
              │                          ┌──────────────────┐
              │                          │  Upstash Redis   │
              │                          │   (BullMQ queue) │
              │                          └────────▲─────────┘
              │                                   │
              │                                   │ pick up
   ┌──────────┴──────────┐                        │
   │     Supabase        │◀───────────────────────┤
   │  (jobs + outputs)   │     update job status  │
   └─────────────────────┘                        │
                                                  │
                                       ┌──────────┴───────────┐
                                       │       Railway        │
                                       │  (worker process)    │
                                       │  npm run worker:tryon│
                                       └──────────────────────┘
```

Vercel handles user-facing traffic. Railway handles long-running generation.
Redis is the message bus between them. Both read/write the same Supabase DB.

---

## Step 1 — Make sure Upstash Redis is set up

If you don't already have a Redis instance:

1. Go to [console.upstash.com](https://console.upstash.com)
2. Create a new Redis database (any region; closest to Vercel and Railway is best)
3. From the database page, copy the **Redis URL** (starts with `rediss://`)

You'll use this same URL on both Vercel AND Railway.

> Note: BullMQ needs the **socket URL**, not the REST URL. Make sure you copy the
> one that starts with `rediss://default:...@...upstash.io:6379`.

---

## Step 2 — Set env vars on Vercel (the web side)

In **Vercel → Project Settings → Environment Variables**, make sure these are set:

```
# Redis queue (required for queue mode)
UPSTASH_REDIS_URL          = rediss://default:PASSWORD@HOST.upstash.io:6379
TRYON_QUEUE_ENABLED        = true

# Gemini key pool (already done)
GEMINI_API_KEYS            = key1,key2,key3,key4,key5,key6

# Try-on tuning (already done)
TRYON_LIMITER_ENABLED       = true
MAX_TRYON_PER_DAY           = 10
TRYON_COOLDOWN_SECONDS      = 15
MAX_TRYON_PER_HOUR          = 15
TRYON_KILL_SWITCH_THRESHOLD_USD = 20.0
TRYON_MAX_QUEUE_DEPTH       = 60
GEMINI_PRO_MAX_CONCURRENT   = 4
GEMINI_PRO_MIN_TIME_MS      = 1200
GEMINI_FLASH_MAX_CONCURRENT = 5
GEMINI_FLASH_MIN_TIME_MS    = 400

# All the other production env vars you already have
# (SUPABASE_*, OPENAI_API_KEY, RAZORPAY_*, SMTP_*, etc.)
```

**Do NOT set** `QSTASH_TOKEN` etc. — leaving those unset makes the API skip the
QStash path and go straight to BullMQ.

After saving, redeploy Vercel.

---

## Step 3 — Create the Railway service

1. Go to [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub repo**
3. Select **DridhaTeamHQ/Tria-pilot**
4. Railway auto-detects `railway.toml` and uses `npm run worker:tryon` as the start command

---

## Step 4 — Set env vars on Railway (the worker side)

The worker needs the **same** env vars as Vercel for these reasons:
- It writes to the same Supabase → needs Supabase keys
- It calls Gemini → needs API keys
- It pulls from the same Redis → needs Redis URL

In **Railway → Service → Variables**, paste this entire block (replacing values
with your real ones — these should be identical to your Vercel values):

```
# ── Database ─────────────────────────────────────
DATABASE_URL                       = <same as Vercel>
DIRECT_URL                         = <same as Vercel>

# ── Supabase ─────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL           = <same as Vercel>
NEXT_PUBLIC_SUPABASE_ANON_KEY      = <same as Vercel>
SUPABASE_SERVICE_ROLE_KEY          = <same as Vercel>

# ── AI APIs ──────────────────────────────────────
GEMINI_API_KEYS                    = key1,key2,key3,key4,key5,key6
OPENAI_API_KEY                     = sk-proj-...

# ── Redis (BullMQ queue) — MUST match Vercel ─────
UPSTASH_REDIS_URL                  = rediss://default:PASSWORD@HOST.upstash.io:6379
TRYON_QUEUE_ENABLED                = true

# ── Worker concurrency tuning ────────────────────
TRYON_WORKER_CONCURRENCY           = 6
GEMINI_PRO_MAX_CONCURRENT          = 4
GEMINI_PRO_MIN_TIME_MS             = 1200
GEMINI_FLASH_MAX_CONCURRENT        = 5
GEMINI_FLASH_MIN_TIME_MS           = 400

# ── NodeJS environment ───────────────────────────
NODE_ENV                           = production
```

**Do NOT set** any Razorpay/SMTP/Next.js-only vars on Railway — the worker
doesn't need them. Less surface area = fewer leaks.

---

## Step 5 — Deploy

Click **Deploy** in Railway. The first deploy takes 2-3 minutes (npm install +
build).

Watch the **Deploy logs** until you see this confirmation:

```
🔑 Gemini API key pool initialized: 6 key(s)
👷 Try-on worker started — concurrency: 6
```

If you see this, the worker is online and waiting for jobs.

---

## Step 6 — Verify the full pipeline

### Check 1: Worker heartbeat

Hit `/api/admin/tryon-health` on your Vercel app as an admin. Look for:

```json
"queue": {
  "provider": "bullmq",            ← BullMQ is now active
  "qstashConfigured": false,
  "bullmqConfigured": true,
  "bullmqAvailable": true,
  "bullmqWorkerOnline": true,      ← THIS must be true
  "bullmqStats": { "waiting": 0, "active": 0, ... }
}
```

If `bullmqWorkerOnline` is `false`:
- Railway logs likely show an error (Redis URL wrong, missing key, etc.)
- Or the heartbeat hasn't ticked yet (wait 30s and refresh)

### Check 2: End-to-end test

1. Submit a try-on as a normal user
2. Watch Vercel logs — should see `📋 Queue depth: 0/60`
3. Watch Railway logs — should see `🚀 process-job: starting 3 parallel generations for job ...`
4. Frontend should show queue position (`#1` then complete)

---

## How load handling works now

| Concurrent users | What happens |
|---|---|
| 1-6 | Worker processes them in parallel immediately |
| 7-30 | First 6 process, rest queue and run as slots free up |
| 31-60 | Queue fills, frontend shows queue position to users |
| 61+ | Returns clean 503 "queue full, try in 60s" instead of crashing |

No more SERVER_BUSY errors. No 504 chaos. Each generation gets its own
worker slot with full Gemini key pool.

---

## Cost on Railway

The worker is a small Node.js process. Railway charges by RAM × time.

- Idle worker (no jobs): ~150 MB RAM × $0.01/GB-hour = **~$1/month**
- Active processing 6 concurrent jobs: ~500 MB RAM
- Realistic monthly bill at 1000 generations/day: **~$5-10/month**

Cheaper than QStash at high volume (~$30-50/mo for QStash at 10k generations/day).

---

## Troubleshooting

### `bullmqWorkerOnline: false` after deploy

1. Railway → service → **Deploy logs**: look for errors
2. Most common: `UPSTASH_REDIS_URL` mismatch between Vercel and Railway. They
   MUST point to the same Redis. Re-copy the URL from Upstash console.
3. Check `TRYON_QUEUE_ENABLED=true` is set on BOTH platforms

### Worker keeps crashing

1. Railway → **Metrics** → check memory usage. If hitting 1 GB+ frequently,
   reduce `TRYON_WORKER_CONCURRENCY` (try 4)
2. Look for `OOMKilled` in deploy logs → upgrade Railway plan or reduce concurrency

### Jobs queue but never process

1. Worker is offline (see first issue above)
2. OR worker is online but Gemini keys are all 429'd → check key pool stats
   in `/api/admin/tryon-health` (`gemini.keyPool.cooldownKeys`)

### Queue grows unbounded

1. Generation is slower than incoming rate
2. Either reduce traffic, add more Gemini keys, or scale up Railway
   (raise `TRYON_WORKER_CONCURRENCY`)

---

## Removing QStash leftovers

The QStash code is still in the repo as an optional alternative path, but it's
inert when `QSTASH_TOKEN` is unset. You can leave it for future flexibility, or
remove it later by deleting:

- `src/lib/queue/qstash.ts`
- `src/app/api/tryon/process/`
- The QStash priority block in `src/app/api/tryon/route.ts` (lines 778-820 or so)
- The `@upstash/qstash` dependency in `package.json`

Not recommended to remove yet — keeps your options open.

---

## Summary

| Component | Hosted on | Purpose |
|---|---|---|
| Next.js app | Vercel | Frontend + API routes |
| BullMQ worker | Railway | Processes try-on generations |
| Redis queue | Upstash | Message bus between the two |
| Database | Supabase | Job state, outputs, users |
| AI | Gemini API | Image generation |

One repo, two deployments, both reading the same `main` branch. Push to GitHub
→ both Vercel and Railway auto-deploy. Done.
