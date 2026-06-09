// FLUX (Black Forest Labs) health check — do the keys respond? Do they have credits?
import { readFileSync } from 'node:fs'

function readEnv(name) {
  try {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    const line = env.split(/\r?\n/).find((l) => l.startsWith(name + '='))
    return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') : ''
  } catch { return '' }
}

const multi = (process.env.FLUX_API_KEYS || readEnv('FLUX_API_KEYS') || '').split(',').map((k) => k.trim()).filter(Boolean)
const single = (process.env.FLUX_API_KEY || readEnv('FLUX_API_KEY') || '').trim()
const keys = [...new Set([...multi, ...(single ? [single] : [])])]
const MODEL = (process.env.FLUX_TRYON_MODEL || readEnv('FLUX_TRYON_MODEL') || 'flux-2-pro').trim()
const BASE = 'https://api.bfl.ai/v1'

console.log('=== FLUX HEALTH CHECK ===')
console.log('Model:', MODEL, '| keys found:', keys.length)
if (!keys.length) { console.log('No FLUX keys. Aborting.'); process.exit(1) }

async function submit(key) {
  const res = await fetch(`${BASE}/${MODEL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-key': key },
    body: JSON.stringify({ prompt: 'a plain red apple on a white background', width: 512, height: 512, output_format: 'png' }),
    signal: AbortSignal.timeout(30000),
  })
  const text = await res.text()
  let body; try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, body }
}

async function poll(key, id, pollUrl) {
  const url = pollUrl || `${BASE}/get_result?id=${encodeURIComponent(id)}`
  const res = await fetch(url, { headers: { Accept: 'application/json', 'x-key': key }, signal: AbortSignal.timeout(15000) })
  return res.json().catch(() => null)
}

let firstGood = null
for (let i = 0; i < keys.length; i++) {
  const k = keys[i]
  const tag = `key#${i + 1} …${k.slice(-4)}`
  try {
    const t = Date.now()
    const { status, body } = await submit(k)
    if (status === 200 && body?.id) {
      console.log(`✅ ${tag}: SUBMIT OK (${Date.now() - t}ms) jobId=${String(body.id).slice(0, 8)} — has credits`)
      if (!firstGood) firstGood = { key: k, id: body.id, pollUrl: body.polling_url, tag }
    } else if (status === 402) {
      console.log(`❌ ${tag}: 402 INSUFFICIENT CREDITS — ${JSON.stringify(body).slice(0, 160)}`)
    } else if (status === 401 || status === 403) {
      console.log(`❌ ${tag}: ${status} BAD/UNAUTHORIZED KEY — ${JSON.stringify(body).slice(0, 160)}`)
    } else if (status === 429) {
      console.log(`⚠️ ${tag}: 429 RATE LIMITED — ${JSON.stringify(body).slice(0, 160)}`)
    } else {
      console.log(`❓ ${tag}: HTTP ${status} — ${JSON.stringify(body).slice(0, 200)}`)
    }
  } catch (e) {
    console.log(`❌ ${tag}: ERROR ${e?.message || e}`)
  }
}

// Confirm one job actually completes end-to-end (proves credits truly work).
if (firstGood) {
  console.log(`\nPolling ${firstGood.tag} to confirm full generation...`)
  for (let attempt = 0; attempt < 40; attempt++) {
    await new Promise((r) => setTimeout(r, 1500))
    const r = await poll(firstGood.key, firstGood.id, firstGood.pollUrl)
    const st = r?.status
    if (st === 'Ready') { console.log(`✅ GENERATION COMPLETE — FLUX is fully working. sample=${(r?.result?.sample || '').slice(0, 60)}…`); break }
    if (st === 'Error' || st === 'Content Moderated' || st === 'Request Moderated') { console.log(`⚠️ finished as ${st}: ${JSON.stringify(r).slice(0, 200)}`); break }
    if (attempt % 5 === 0) console.log(`  …status=${st}`)
    if (attempt === 39) console.log('  ⌛ still pending after 60s (submit worked, so credits are fine)')
  }
} else {
  console.log('\n❌ No key could submit a job — FLUX is NOT usable right now (see errors above).')
}
console.log('\n=== DONE ===')
