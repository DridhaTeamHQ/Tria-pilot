/**
 * TRY-ON QUALITY VALIDATOR (GPT-4o mini vision)
 *
 * Lightweight post-generation quality check. Catches the silent failure
 * modes that the existing face-similarity validator misses:
 *   - Output doesn't actually show the swapped garment
 *   - Wrong body region was modified (top extended into a dress, etc.)
 *   - Output is nearly unchanged from input (no swap happened)
 *   - Garment looks pasted/overlaid (sticker effect, not naturally worn)
 *
 * Returns null on any error so the caller treats it as "couldn't validate"
 * rather than as a failure — never blocks the pipeline on validator issues.
 *
 * Cost: ~$0.001 per validation (gpt-4o-mini at low detail across 3 images).
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'

export interface QualityValidationResult {
  /** Overall pass/fail */
  valid: boolean
  /** 0-100 quality score */
  score: number
  /** Specific issues found (if any) */
  issues: string[]
  /** One-sentence summary */
  reasoning: string
  /** Time taken in ms */
  durationMs: number
}

const isDev = process.env.NODE_ENV !== 'production'

const SYSTEM_PROMPT = `You are a quality validator for AI virtual try-on outputs. You receive 3 images:
- Image 1: REFERENCE PHOTO (the person we want to swap clothing on)
- Image 2: PRODUCT GARMENT (the clothing that should be put on her)
- Image 3: AI-GENERATED OUTPUT (the try-on engine's result)

Score the OUTPUT (image 3) against these criteria:
1. IDENTITY — same person as image 1? (face, hair, skin tone, body type)
2. GARMENT — does image 3 show her wearing the garment from image 2? (same color, pattern, style, sleeves, neckline)
3. COVERAGE — was only the correct region changed? For top swaps, her pants/bottom must match image 1. For bottom swaps, her top must match image 1.
4. REALISM — looks like a real photo? No overlay/sticker artifacts, no distorted body, no melted face?

Return ONLY JSON, no markdown:
{
  "valid": boolean,
  "score": number,
  "issues": ["array of specific problems if any"],
  "reasoning": "one sentence summary"
}

Be STRICT. Fail if:
- Different face/person from image 1
- The new garment isn't visibly present in image 3
- Bottom changed when only top should have, or vice versa
- Garment looks pasted/overlaid instead of naturally worn
- Image is essentially identical to image 1 (no swap happened)
- Major artifacts (melted face, extra limbs, distorted body)

Pass if: same person, wearing the new garment naturally, non-swap regions preserved, looks photorealistic. Score reflects how clean the swap is (90+ = excellent, 70-89 = acceptable, <70 = fail).`

export async function validateTryOnQuality(params: {
  referencePhotoBase64: string
  garmentBase64: string
  outputBase64: string
  coverage?: 'upper_only' | 'lower_only' | 'full_body' | 'layered'
}): Promise<QualityValidationResult | null> {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) return null

  const t0 = Date.now()

  try {
    const openai = getOpenAI()
    const strip = (b64: string) => b64.replace(/^data:image\/[a-z+]+;base64,/, '')

    const coverageHint = params.coverage
      ? `Coverage: ${params.coverage}. ${
          params.coverage === 'upper_only'
            ? 'Only the top should have changed. Her pants/skirt/bottom-wear must look identical to image 1.'
            : params.coverage === 'lower_only'
              ? 'Only the bottom should have changed. Her top/shirt must look identical to image 1.'
              : params.coverage === 'full_body'
                ? 'The full outfit was swapped.'
                : 'Layered outerwear was added or swapped.'
        }`
      : ''

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: `Validate the try-on output.${coverageHint ? ` ${coverageHint}` : ''}` },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${strip(params.referencePhotoBase64)}`, detail: 'low' } },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${strip(params.garmentBase64)}`, detail: 'low' } },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${strip(params.outputBase64)}`, detail: 'low' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 350,
    }, { timeout: 15_000 })

    const text = response.choices?.[0]?.message?.content?.trim() || ''
    if (!text) return null

    const parsed = JSON.parse(text) as {
      valid?: boolean
      score?: number
      issues?: string[]
      reasoning?: string
    }

    const result: QualityValidationResult = {
      valid: parsed.valid === true,
      score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 0,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 5).map(String) : [],
      reasoning: String(parsed.reasoning || '').slice(0, 200),
      durationMs: Date.now() - t0,
    }

    if (isDev) {
      const tag = result.valid ? '✅' : '❌'
      console.log(`${tag} Quality validator: ${result.score}/100 in ${result.durationMs}ms — ${result.reasoning}`)
      if (result.issues.length > 0) {
        console.log(`   Issues: ${result.issues.join(' | ')}`)
      }
    }

    return result
  } catch (err) {
    if (isDev) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`⚠️ Quality validator failed: ${msg.slice(0, 150)}`)
    }
    return null
  }
}
