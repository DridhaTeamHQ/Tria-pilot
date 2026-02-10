/**
 * Verify garment asset system: hash utility and (if env is set) DB table + helpers.
 * Run after applying database/migrations/garment_assets.sql in Supabase.
 *
 * Usage: npx tsx scripts/verify-garments.ts
 */

import dotenv from 'dotenv'
// Load .env.local first (Next.js convention), then .env
dotenv.config({ path: '.env.local' })
dotenv.config()
import {
  hashImageForGarment,
  getGarmentByHash,
  getGarmentsByProduct,
  createGarmentIfNotExists,
} from '../src/lib/garments'

async function main() {
  console.log('Verifying Garment Asset system...\n')

  // 1. Hash utility (no DB)
  const testBase64 = 'iVBORw0KGgo=' // minimal valid base64
  const hash = hashImageForGarment(testBase64)
  if (!hash || typeof hash !== 'string' || hash.length !== 64 || !/^[a-f0-9]+$/.test(hash)) {
    console.error('FAIL: hashImageForGarment should return 64-char hex SHA-256')
    process.exit(1)
  }
  console.log('OK: hashImageForGarment returns deterministic SHA-256 hex')

  const hash2 = hashImageForGarment(testBase64)
  if (hash !== hash2) {
    console.error('FAIL: same input should yield same hash')
    process.exit(1)
  }
  console.log('OK: same input yields same hash (deterministic)\n')

  // 2. DB helpers (require Supabase env)
  const hasSupabase =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!hasSupabase) {
    console.log('Skip DB checks: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
    console.log('Apply database/migrations/garment_assets.sql in Supabase, then set env and re-run to verify table.')
    process.exit(0)
  }

  const nonexistentHash = '0000000000000000000000000000000000000000000000000000000000000000'
  const byHash = await getGarmentByHash(nonexistentHash)
  if (byHash !== null) {
    console.error('FAIL: getGarmentByHash(nonexistent) should return null')
    process.exit(1)
  }
  console.log('OK: getGarmentByHash returns null for nonexistent hash')

  const byProduct = await getGarmentsByProduct('00000000-0000-0000-0000-000000000000')
  if (!Array.isArray(byProduct) || byProduct.length !== 0) {
    console.error('FAIL: getGarmentsByProduct should return empty array when none')
    process.exit(1)
  }
  console.log('OK: getGarmentsByProduct returns empty array when none')

  const { garment, created } = await createGarmentIfNotExists({
    image_hash: nonexistentHash,
    clean_garment_image_url: 'https://example.com/clean.png',
    source_image_url: 'https://example.com/source.png',
  })
  if (!garment || garment.image_hash !== nonexistentHash || !created) {
    console.error('FAIL: createGarmentIfNotExists should insert and return created: true')
    process.exit(1)
  }
  console.log('OK: createGarmentIfNotExists inserted new garment')

  const { garment: existing, created: created2 } = await createGarmentIfNotExists({
    image_hash: nonexistentHash,
    clean_garment_image_url: 'https://example.com/other.png',
    source_image_url: 'https://example.com/other-src.png',
  })
  if (!existing || existing.id !== garment.id || created2 !== false) {
    console.error('FAIL: createGarmentIfNotExists should return existing row, created: false')
    process.exit(1)
  }
  console.log('OK: createGarmentIfNotExists returns existing row (idempotent)\n')

  console.log('All checks passed.')
}

main().catch((err) => {
  console.error('Error:', err.message)
  if (err.message?.includes('relation') && err.message?.includes('garments')) {
    console.error('\n→ Apply database/migrations/garment_assets.sql in Supabase SQL Editor, then re-run.')
  }
  process.exit(1)
})
