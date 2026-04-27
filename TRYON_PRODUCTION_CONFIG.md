# Try-On Pipeline — Production Configuration Guide

Everything you need to make the try-on pipeline production-ready, in order.

---

## Step 1 — Add API key pool to `.env`

Edit your `.env` and replace your single Gemini key with a pool. Example for 3 keys:

```env
# Existing single key (keep — used as fallback)
GEMINI_API_KEY="AIzaSyAdFIroC1TZ3by49Mstm8Q2taitzppkF04"

# NEW: Pool of all keys (include the one above too)
GEMINI_API_KEYS="AIzaSyAdFIroC1TZ3by49Mstm8Q2taitzppkF04,AIzaSyKEY2HERE,AIzaSyKEY3HERE"
```

Restart the server. You should see in the console:
```
🔑 Gemini API key pool initialized: 3 key(s)
```

---

## Step 2 — Add the production tuning block to `.env`

Paste this entire block into your `.env`. The values shown are sized for a **3-key pool** (the most common starting point):

```env
# ── Try-On production tuning ──────────────────────────────
TRYON_LIMITER_ENABLED="true"
MAX_TRYON_PER_DAY="10"
TRYON_COOLDOWN_SECONDS="15"
MAX_TRYON_PER_HOUR="15"
TRYON_KILL_SWITCH_THRESHOLD_USD="15.0"
TRYON_MAX_QUEUE_DEPTH="50"
TRYON_WORKER_CONCURRENCY="4"
GEMINI_PRO_MAX_CONCURRENT="2"
GEMINI_PRO_MIN_TIME_MS="2500"
GEMINI_FLASH_MAX_CONCURRENT="3"
GEMINI_FLASH_MIN_TIME_MS="500"
```

---

## Step 3 — Tune for your actual key count

If you have a different number of keys, use this lookup table instead:

| Keys | `WORKER_CONCURRENCY` | `PRO_MAX_CONCURRENT` | `PRO_MIN_TIME_MS` | Effective Pro RPM |
|------|---------------------|----------------------|-------------------|-------------------|
| 1    | 2                   | 1                    | 5000              | ~12               |
| 3    | 4                   | 2                    | 2500              | ~24               |
| 5    | 6                   | 3                    | 1500              | ~40               |
| 10   | 10                  | 5                    | 800               | ~75               |

The math: `PRO_MIN_TIME_MS ≈ 60000 / (keys × 2)`

---

## Step 4 — Restart server + worker

```bash
# Restart Next.js server
npm run dev    # or your prod start command

# Restart the worker process (separate terminal)
node dist/workers/tryon-worker.js   # or tsx src/workers/tryon-worker.ts
```

Worker should log:
```
👷 Try-on worker started — concurrency: 4
```

---

## Step 5 — Verify with the admin health endpoint

Hit this URL while logged in as an admin user:

```
GET /api/admin/tryon-health
```

Expected response shape:

```json
{
  "timestamp": "2026-04-27T...",
  "gemini": {
    "keyPool": { "totalKeys": 3, "availableKeys": 3, "cooldownKeys": 0 },
    "estimatedProRPM": 6,
    "estimatedFlashRPM": 30
  },
  "queue": {
    "configured": true,
    "available": true,
    "workerOnline": true,
    "stats": { "waiting": 0, "active": 0, "completed": 12, "failed": 1, "delayed": 0 }
  },
  "database": {
    "pendingJobs": 0,
    "processingJobs": 0,
    "failedJobsLast24h": 1
  },
  "cost": {
    "dailySpendUSD": 0.45,
    "dailyLimitUSD": 20,
    "killSwitchActive": false,
    "killSwitchThresholdUSD": 15,
    "totalGenerationsToday": 18
  },
  "config": { ... }
}
```

This is your operational dashboard. Hit it during traffic spikes to see exactly what's happening.

---

## Step 6 — Behavior under load (what users see now)

### Normal load (5 users at once)
- All 5 jobs enqueue immediately
- Worker processes 4 in parallel, 1 waits ~30s
- All complete in 30-60s

### Heavy load (50 users at once)
- Jobs enqueue, queue depth grows
- API returns `{ queued: true, jobId: "...", queuePosition: N }`
- Frontend polls `/api/tryon/jobs/active` and shows "You're #12 of 47 in queue"
- All jobs complete within 5-10 minutes

### Spike (100+ users at once)
- First 50 enqueue successfully
- After queue depth = 50, new requests get **503 "Queue full, try again in 60s"** with `Retry-After: 60` header
- Frontend should show "We're at capacity right now — please try in a minute"
- This protects the queue from unbounded growth and keeps existing jobs from waiting forever

### Abuse (one user spamming generate)
- After 10 generations they hit `MAX_TRYON_PER_DAY` → blocked until tomorrow
- Within a session, 15s cooldown between generations enforced
- IP-level cap kicks in at 15 requests/hour as a backstop

### Cost runaway (something goes wrong)
- Daily spend tracked across all generations
- At $15/day total spend → kill switch flips → all generations blocked
- Auto-resets at midnight

---

## Step 7 — What to monitor

Watch these in the health endpoint:

| Metric | Healthy | Warning | Critical |
|---|---|---|---|
| `gemini.keyPool.cooldownKeys` | 0 | 1-2 | All keys cooling down |
| `queue.stats.waiting` | < 10 | 10-40 | > 40 (near depth cap) |
| `queue.stats.failed` (last hour) | < 5% of total | 5-15% | > 15% |
| `database.failedJobsLast24h` | < 5% of total | 5-10% | > 10% |
| `cost.dailySpendUSD` | < 50% of limit | 50-90% | > 90% |
| `queue.workerOnline` | true | — | false |

---

## Step 8 — Frontend changes you should make

The API now returns `queuePosition` and `queueDepth` in `/api/tryon/jobs/active`. Update your try-on UI:

```tsx
// While polling for active job:
const { active, queuePosition, queueDepth } = await response.json()

if (queuePosition === 0) {
  // Currently generating
  showStatus("Generating your try-on... (about 30 seconds)")
} else if (queuePosition !== null) {
  // Waiting in queue
  showStatus(`You're #${queuePosition} of ${queueDepth} in line. About ${queuePosition * 30}s to start.`)
}
```

And handle the new `QUEUE_FULL` response from `POST /api/tryon`:

```tsx
if (response.status === 503 && data.code === 'QUEUE_FULL') {
  showError("We're at capacity right now. Please try again in a minute.")
  return
}

if (response.status === 429 && data.code === 'GENERATION_LIMIT') {
  showError(data.error)  // "Daily limit reached" / "Cooldown active" / etc.
  return
}
```

---

## Summary — what changed today

| File | Change |
|---|---|
| `src/lib/gemini/executor.ts` | 504 retry, image-model retry count up to 5, env-tunable Bottleneck limits |
| `src/lib/nanobanana.ts` | 504 detection in error fallback, better error messages |
| `src/lib/generation-limiter.ts` | `checkGenerationGate` now actually enforces the 3 layers |
| `src/app/api/tryon/route.ts` | Calls limiter on every request, queue depth cap |
| `src/app/api/tryon/jobs/active/route.ts` | Returns queue position + depth |
| `src/workers/tryon-worker.ts` | Worker concurrency now env-tunable |
| `src/app/api/admin/tryon-health/route.ts` | NEW — admin operational dashboard endpoint |
| `.env.example` | Documents all new tuning variables |

The pipeline is now resilient to:
- 504 / 503 / 429 errors (auto-retry with backoff)
- Single-user abuse (daily cap + cooldown)
- Traffic spikes (queue depth cap + queue position UX)
- Runaway costs (kill switch)
- Multiple API keys (round-robin with per-key cooldowns)
