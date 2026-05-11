/**
 * GPT-4O VISION ORCHESTRATOR
 *
 * Single GPT-4o call that does TWO jobs at once:
 *   1. Look at the cleaned garment image + a pool of influencer photos
 *      → pick the 3 best photos for THIS specific garment
 *   2. Write a custom FLUX clothing-swap prompt for each selected photo
 *
 * Replaces the previous rules-based photo scoring + template-built FLUX
 * prompt. Vision-based selection + per-photo prompt writing gives us:
 *   - photos whose existing clothing has the right coverage for the new
 *     garment (e.g. for jeans, pick photos where she's wearing a separate
 *     top, not a dress)
 *   - prompts tailored to each photo (mentions the specific top to
 *     preserve, the existing background, the pose)
 *
 * The orchestrator only fires when OPENAI_API_KEY is set. If it fails or
 * isn't configured, the caller falls back to the existing rules-based path.
 */

import 'server-only'
import { getOpenAI } from '@/lib/openai'

export interface PhotoCandidate {
  id: string
  imageUrl: string
  /** Optional metadata hints from prior analysis */
  bodyVisibility?: string
  framing?: string
  description?: string
}

export interface OrchestratedPhoto {
  /** Reference photo ID to use */
  photoId: string
  /** Custom FLUX prompt for swapping this garment onto this specific photo */
  prompt: string
  /** Why GPT-4o picked this photo (1 short sentence) */
  reasoning: string
}

export interface OrchestrateResult {
  /** Three selected photo + prompt pairs */
  selections: OrchestratedPhoto[]
  /** Overall garment understanding GPT-4o derived */
  garmentSummary: string
  /** Total wall-clock ms */
  durationMs: number
}

const isDev = process.env.NODE_ENV !== 'production'

const SYSTEM_PROMPT = `You are an expert virtual try-on orchestrator. Your job: look at a clothing product and a pool of model photos, then decide which 3 photos will produce the best AI clothing-swap outputs, and write a tailored FLUX prompt for each.

INPUT YOU RECEIVE:
- Image 1: the clothing product (cleaned, garment-only OR with a model wearing it)
- Images 2..N: candidate influencer photos to swap this garment onto
- Product name / description as text

YOUR JOB (two outputs in a single JSON):

PART 1 — SELECT 3 PHOTOS (best for this swap)
Score each candidate by:
- Coverage match: if product is a TOP (upper_only), prefer photos where her existing bottom-wear is clearly visible (so it can be preserved). If product is PANTS (lower_only), prefer photos where her existing top is clearly visible AND her legs are visible (so the new pants show). If product is a DRESS (full_body), prefer full-body photos.
- Pose / framing: prefer photos with clean, fashion-shoot-style poses over awkward selfies. Front-facing or three-quarter is ideal. Side profiles only if the garment has distinctive side details.
- Compatibility: avoid photos where her existing clothing is ALREADY a similar style to the new garment (e.g. don't pick a photo of her in a paisley dress when swapping in a paisley top — the result will look unchanged).
- Diversity: the 3 picks should look DIFFERENT from each other (varied poses, backgrounds, angles) so the influencer gets 3 distinct try-on shots, not 3 near-duplicates.
- Quality: prefer well-lit, sharp, properly framed photos. Skip blurry/tiny/face-only crops unless coverage demands it.

PART 2 — WRITE A FLUX PROMPT FOR EACH SELECTED PHOTO
For each of the 3 selected photos, write a prompt using this exact pattern (Black Forest Labs official style):

  "Change the woman's <region> to <specific garment description with colors, pattern, sleeves, length>, exactly as shown in image 2. Keep her <existing-preserved-items including the specific top/bottom she's wearing, her face, hair, body, pose, framing, lighting, and background> exactly the same as image 1. The new garment must drape naturally on her body with realistic fabric folds — it is being worn, not overlaid."

CRITICAL rules for the prompt:
- Use the verb "change" (NOT "replace", "transform", or "swap" — those trigger different generation modes that produce overlay artifacts)
- Reference the SPECIFIC existing garment in the photo by name (e.g. "her red sweater" not just "her top") — this anchors preservation
- Reference the SPECIFIC NEW garment with concrete attributes (colors, pattern, neckline, sleeves)
- For LOWER swaps (pants/skirt): explicitly say "show the legs so the new bottom is fully visible, do not crop above the knee"
- For UPPER swaps: explicitly say "preserve the existing bottom-wear (pants/skirt/jeans) and keep full body framing"
- Keep each prompt under 800 characters

OUTPUT — return ONLY valid JSON, no markdown:
{
  "garmentSummary": "1-2 sentence summary of what the product is",
  "selections": [
    {
      "photoId": "<candidate id>",
      "prompt": "<the FLUX prompt for this photo>",
      "reasoning": "<1 short sentence why this photo>"
    },
    { ... },
    { ... }
  ]
}

You MUST return exactly 3 selections. If fewer than 3 candidates are suitable, pick the next best to fill the slots.`

export async function orchestrateTryOn(params: {
  /** Clean garment image (base64, no data: prefix) */
  garmentBase64: string
  /** Pool of candidate photos — pass at least 3, up to ~10 for cost control */
  candidates: PhotoCandidate[]
  /** Product text (name + description) for disambiguation */
  productText?: string
  /** Optional: pre-extracted garment intel summary to seed reasoning */
  garmentSummary?: string
}): Promise<OrchestrateResult | null> {
  const apiKey = (process.env.OPENAI_API_KEY || '').trim()
  if (!apiKey) {
    if (isDev) console.warn('🎬 GPT orchestrator skipped — OPENAI_API_KEY not set')
    return null
  }
  if (params.candidates.length === 0) {
    if (isDev) console.warn('🎬 GPT orchestrator skipped — no candidate photos')
    return null
  }

  const startedAt = Date.now()

  try {
    const openai = getOpenAI()

    // Cap candidate pool at 8 — costs scale with image count and 8 is
    // more than enough to find 3 good picks.
    const candidatesForCall = params.candidates.slice(0, 8)

    // Build a candidate manifest so GPT-4o knows which photo is which
    const manifest = candidatesForCall.map((c, idx) => {
      const hints: string[] = []
      if (c.bodyVisibility) hints.push(`bodyVisibility=${c.bodyVisibility}`)
      if (c.framing) hints.push(`framing=${c.framing}`)
      if (c.description) hints.push(`description="${c.description.slice(0, 100)}"`)
      const hintStr = hints.length > 0 ? ` (${hints.join(', ')})` : ''
      return `Image ${idx + 2}: candidate id=${c.id}${hintStr}`
    }).join('\n')

    const userContent: any[] = [
      {
        type: 'text',
        text: `${params.productText ? `Product: ${params.productText.slice(0, 200)}\n\n` : ''}${params.garmentSummary ? `Garment summary: ${params.garmentSummary.slice(0, 200)}\n\n` : ''}Candidate photos manifest:\n${manifest}\n\nLook at the garment (Image 1) and each candidate (Images 2-${candidatesForCall.length + 1}). Pick the 3 best photos for this swap and write a FLUX prompt for each. Return JSON only.`,
      },
      // Image 1 = the garment
      {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${params.garmentBase64}`,
          detail: 'high',
        },
      },
      // Images 2..N = candidate photos
      ...candidatesForCall.map((c) => ({
        type: 'image_url' as const,
        image_url: {
          url: c.imageUrl,
          detail: 'low' as const, // low detail = ~85 tokens vs 700 — affordable at scale
        },
      })),
    ]

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 2000,
    }, {
      timeout: 45_000, // Larger than single-image calls because it processes many images
    })

    const text = response.choices?.[0]?.message?.content?.trim() || ''
    if (!text) throw new Error('Empty orchestrator response')

    const parsed = JSON.parse(text) as {
      garmentSummary?: string
      selections?: Array<{ photoId?: string; prompt?: string; reasoning?: string }>
    }

    if (!Array.isArray(parsed.selections) || parsed.selections.length === 0) {
      throw new Error('Orchestrator returned no selections')
    }

    // Validate every selection — photoId must match one of the candidates
    const validIds = new Set(candidatesForCall.map((c) => c.id))
    const cleanSelections: OrchestratedPhoto[] = []

    for (const sel of parsed.selections) {
      if (!sel.photoId || !sel.prompt) continue
      if (!validIds.has(sel.photoId)) {
        if (isDev) console.warn(`🎬 Orchestrator returned unknown photoId: ${sel.photoId} — skipping`)
        continue
      }
      cleanSelections.push({
        photoId: sel.photoId,
        prompt: String(sel.prompt).slice(0, 1200),
        reasoning: String(sel.reasoning || '').slice(0, 200),
      })
      if (cleanSelections.length >= 3) break
    }

    if (cleanSelections.length === 0) {
      throw new Error('Orchestrator returned only invalid photoIds')
    }

    // If we didn't get 3, top up with the highest-ranked unselected candidates
    if (cleanSelections.length < 3) {
      const usedIds = new Set(cleanSelections.map((s) => s.photoId))
      const fallbackPrompt = cleanSelections[0].prompt
      for (const c of candidatesForCall) {
        if (cleanSelections.length >= 3) break
        if (usedIds.has(c.id)) continue
        cleanSelections.push({
          photoId: c.id,
          prompt: fallbackPrompt, // reuse the first prompt as fallback — better than nothing
          reasoning: 'Top-up to reach 3 outputs',
        })
      }
    }

    const result: OrchestrateResult = {
      selections: cleanSelections,
      garmentSummary: parsed.garmentSummary || '',
      durationMs: Date.now() - startedAt,
    }

    if (isDev) {
      console.log(`🎬 GPT orchestrator: picked ${result.selections.length} photos in ${result.durationMs}ms`)
      result.selections.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.photoId.slice(0, 8)} — ${s.reasoning}`)
      })
    }

    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (isDev) console.warn(`🎬 GPT orchestrator failed: ${msg.slice(0, 200)} — falling back to rules-based path`)
    return null
  }
}
