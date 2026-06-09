// Gemini API health check — does the key respond? Which image models are available? Rate-limited?
import { readFileSync } from 'node:fs'

function readEnvKey(name) {
  try {
    const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    const line = env.split(/\r?\n/).find((l) => l.startsWith(name + '='))
    if (!line) return ''
    return line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '')
  } catch { return '' }
}

const KEY = process.env.GEMINI_API_KEY || readEnvKey('GEMINI_API_KEY')
const mask = KEY ? `${KEY.slice(0, 6)}…${KEY.slice(-4)} (len ${KEY.length})` : 'MISSING'
const BASE = 'https://generativelanguage.googleapis.com/v1beta'

console.log('=== GEMINI HEALTH CHECK ===')
console.log('Key:', mask)
if (!KEY) { console.log('No GEMINI_API_KEY found. Aborting.'); process.exit(1) }

async function timed(label, fn) {
  const t = Date.now()
  try { const r = await fn(); console.log(`\n[${label}] ${Date.now() - t}ms`); return r }
  catch (e) { console.log(`\n[${label}] ERROR ${Date.now() - t}ms:`, e?.message || e); return null }
}

// 1) LIST MODELS — what can this key actually use?
await timed('ListModels', async () => {
  const res = await fetch(`${BASE}/models?key=${KEY}&pageSize=200`)
  console.log('  HTTP', res.status)
  const body = await res.json().catch(() => null)
  if (!res.ok) { console.log('  BODY', JSON.stringify(body).slice(0, 400)); return }
  const models = body?.models || []
  console.log('  total models visible:', models.length)
  const imageModels = models.filter((m) =>
    /image/i.test(m.name) || (m.supportedGenerationMethods || []).some((x) => /image/i.test(x))
  )
  console.log('  IMAGE-capable model names:')
  for (const m of imageModels) {
    console.log(`    - ${m.name.replace('models/', '')}  methods=[${(m.supportedGenerationMethods || []).join(',')}]`)
  }
  // Also explicitly check the ones our code uses
  for (const want of ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image-preview', 'gemini-2.5-flash']) {
    const found = models.find((m) => m.name === `models/${want}`)
    console.log(`  configured "${want}": ${found ? 'AVAILABLE' : 'NOT VISIBLE to this key'}`)
  }
})

// 2) TEXT generation — basic connectivity / quota
await timed('TextGen gemini-2.5-flash', async () => {
  const res = await fetch(`${BASE}/models/gemini-2.5-flash:generateContent?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK.' }] }] }),
  })
  console.log('  HTTP', res.status)
  const body = await res.json().catch(() => null)
  if (!res.ok) { console.log('  ERROR BODY', JSON.stringify(body?.error || body).slice(0, 500)); return }
  const text = body?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '(no text)'
  console.log('  reply:', JSON.stringify(text).slice(0, 100))
})

// 3) IMAGE generation — the actual failing capability. Try each configured image model.
const TINY_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC'
for (const model of ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image-preview']) {
  await timed(`ImageGen ${model}`, async () => {
    const res = await fetch(`${BASE}/models/${model}:generateContent?key=${KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [
          { inlineData: { mimeType: 'image/png', data: TINY_PNG } },
          { text: 'Generate a simple product image of a plain blue t-shirt on a white background.' },
        ] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    })
    console.log('  HTTP', res.status)
    const body = await res.json().catch(() => null)
    if (!res.ok) { console.log('  ERROR BODY', JSON.stringify(body?.error || body).slice(0, 600)); return }
    const parts = body?.candidates?.[0]?.content?.parts || []
    const hasImage = parts.some((p) => p.inlineData?.mimeType?.startsWith('image/'))
    const finish = body?.candidates?.[0]?.finishReason
    console.log(`  finishReason=${finish} parts=${parts.length} hasImage=${hasImage}`)
    if (!hasImage) console.log('  full candidate:', JSON.stringify(body?.candidates?.[0] || body).slice(0, 500))
  })
}

console.log('\n=== DONE ===')
