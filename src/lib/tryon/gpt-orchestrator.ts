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
  /** Why GPT-4o picked this photo (1-2 sentences including current-clothing description) */
  reasoning: string
  /** Optional: GPT-4o's description of what she's currently wearing */
  currentClothing?: string
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

/**
 * Detect an image's MIME type from its base64 magic bytes. The cleaned
 * garment can be PNG (preprocessor output), JPEG or WEBP — labelling it
 * wrong in the data: URL degrades how GPT-4o decodes the garment.
 */
function detectImageMime(base64: string): string {
  const head = base64.slice(0, 16)
  if (head.startsWith('iVBORw0KGgo')) return 'image/png'
  if (head.startsWith('/9j/')) return 'image/jpeg'
  if (head.startsWith('UklGR')) return 'image/webp'
  if (head.startsWith('R0lGOD')) return 'image/gif'
  return 'image/jpeg'
}

const SYSTEM_PROMPT = `You are an expert virtual try-on orchestrator. Your job: look at a clothing product and a pool of model photos, then decide which 3 photos will produce the best AI clothing-swap outputs, and write a tailored FLUX prompt for each.

INPUT YOU RECEIVE:
- Image 1: the clothing product (cleaned, garment-only OR with a model wearing it)
- Images 2..N: candidate influencer photos to swap this garment onto
- Product name / description as text

YOUR JOB (two outputs in a single JSON):

PART 1 — SELECT 3 PHOTOS (best for this swap)

STEP 1A — DESCRIBE THE EXISTING CLOTHING IN EACH CANDIDATE
For EACH candidate photo (image 2, image 3, etc), first describe in 1 short sentence what the woman is currently wearing — both top AND bottom — being specific about TYPE and COLOR. Example:
  - Candidate ABC: "white t-shirt + blue denim jeans"
  - Candidate XYZ: "red knit sweater + black mini skirt"
Include these descriptions in the reasoning field.

STEP 1B — APPLY COMPATIBILITY RULE
Read your descriptions. Then apply the HARD COMPATIBILITY RULE below — eliminate every candidate whose existing clothing in the same region as the product matches.

Score the remaining candidates by:
- Coverage match: if product is a TOP (upper_only), prefer photos where her existing bottom-wear is clearly visible (so it can be preserved). If product is PANTS (lower_only), prefer photos where her existing top is clearly visible AND her legs are visible (so the new pants show). If product is a DRESS (full_body), prefer full-body photos.
- Pose / framing: prefer photos with clean, fashion-shoot-style poses over awkward selfies. Front-facing or three-quarter is ideal. Side profiles only if the garment has distinctive side details.
- **FRAMING / CROP — HARD RULE**: REJECT any photo that is a head-only or tight head-and-bust crop where the head occupies more than ~25% of the frame height, OR where the torso is cut off above the chest, OR where the model's shoulders aren't both fully visible. The try-on output INHERITS the input crop — a head-heavy photo produces a head-heavy try-on where the new garment is barely visible. Prefer photos framed from at least the waist up; full-body photos are best for tops AND bottoms. If the only "good coverage" candidate is also head-heavy, still skip it and pick a wider-framed photo even if its existing clothing is less ideal — a visible garment beats a perfect compatibility match that's cropped off-screen.
- **HARD COMPATIBILITY RULE** (most important): NEVER pick a photo where her existing clothing in the SAME REGION as the product is similar to the product itself.
   - Product is JEANS or PANTS → DO NOT pick photos where she's already wearing jeans, denim, or blue pants. Pick photos where her existing bottom is a SKIRT, SHORTS, LEGGINGS, A DRESS, or visibly different pants (different color/style).
   - Product is a DENIM JACKET → DO NOT pick photos where she's already wearing denim.
   - Product is a WHITE TOP → DO NOT pick photos where she's already wearing a white top. Pick photos with red, black, printed, or other-colored tops.
   - Product is a BLACK DRESS → DO NOT pick photos where she's already in a black dress.
   - This is CRITICAL because FLUX produces near-identical output when the input already matches the target. If you pick a jeans-wearing photo for a jeans swap, the swap will be invisible and the user sees nothing happened. Always pick photos where the visual CHANGE will be obvious.
- Diversity: the 3 picks should look DIFFERENT from each other (varied poses, backgrounds, angles) so the influencer gets 3 distinct try-on shots, not 3 near-duplicates.
- Quality: prefer well-lit, sharp, properly framed photos. Skip blurry/tiny/face-only crops unless coverage demands it.

PART 2 — WRITE A SWAP PROMPT FOR EACH SELECTED PHOTO

Image 2 (the product image) shows the target clothing. Treat it as the literal product to apply to the person in image 1.

Write a simple, direct prompt for each photo using this exact structure:

  "Edit image 1 by changing the clothing to match the garment shown in image 2. The garment is <1-sentence product description: type, colors, pattern, fit>. Preserve the person's identity, pose, framing, camera distance, subject scale, visible body crop, lighting, and background exactly as in image 1 — only the clothing changes. The garment should appear naturally fitted with realistic fabric drape. Photorealistic fashion photography."

Rules:
- Keep it SHORT — under 500 characters total.
- Use NEUTRAL language: "the person", "the subject" — NOT "the woman", "her body".
- Be specific about the new garment (use the productText / garment summary).
- Always include identity preservation ("preserve the person's identity, pose, framing, camera distance, subject scale, visible body crop, lighting, background").
- Always forbid zooming/reframing: no tighter crop, no larger head/torso, no changed body scale, no recentering.
- Do NOT mention regions, coverage, top vs bottom, or "remove the existing X". Just "change the clothing to match this garment".
- Do NOT use anatomical language ("breasts", "chest", "thighs", "body parts"). Just "clothing" and "garment".

OUTPUT — return ONLY valid JSON, no markdown:
{
  "garmentSummary": "1-2 sentence summary of what the product is",
  "candidateDescriptions": [
    { "photoId": "<id>", "currentClothing": "<top + bottom description>" },
    ... one entry per candidate received ...
  ],
  "selections": [
    {
      "photoId": "<candidate id>",
      "prompt": "<the FLUX prompt for this photo>",
      "reasoning": "<2 sentences: (1) what she's currently wearing in this photo, (2) why this is a good swap target — explicitly state how it differs from the product>"
    },
    { ... },
    { ... }
  ]
}

You MUST return exactly 3 selections. The reasoning MUST explicitly confirm the existing clothing differs from the product. If you cannot find 3 photos where the existing clothing differs from the product, pick the 3 most-different ones available and call this out in the reasoning.

If ALL candidates wear similar clothing to the product (e.g. all 8 candidates are jeans-wearing for a jeans product), still pick 3 but in the prompt EMPHASIZE that the new garment is visually distinct: "Replace her existing dark wash slim jeans with the NEW medium-blue mom-fit ankle-length jeans — note the different wash, looser fit, and ankle hem; even though both are jeans, the new pair MUST visually replace the old one with these specific differences."`

export async function orchestrateTryOn(params: {
  /** Clean garment image (base64, no data: prefix) */
  garmentBase64: string
  /** Pool of candidate photos — pass at least 3, up to ~10 for cost control */
  candidates: PhotoCandidate[]
  /** Product text (name + description) for disambiguation */
  productText?: string
  /** Optional: pre-extracted garment intel summary to seed reasoning */
  garmentSummary?: string
  /**
   * Where the garment's main graphic sits. When 'back', the orchestrator
   * prefers back-facing influencer photos so the print is visible.
   */
  graphicPlacement?: 'front' | 'back' | 'both' | 'allover' | 'none'
  /**
   * Companion pieces visible in the product photo. When the product is
   * worn as part of a styled look (e.g. an open shirt over a crop top
   * with jeans), these describe the other pieces so the orchestrator can
   * recreate the COMPLETE outfit, not just the product in isolation.
   */
  visibleTopInPhoto?: string
  visibleBottomInPhoto?: string
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

    // Cap candidate pool at 6 — at detail:'high' each image is expensive
    // (~1k tokens) and 6 still gives the orchestrator real choice when we
    // only need 3. Smaller pool also returns 3-5s faster, which directly
    // protects against function-timeout when OpenAI is slow.
    const candidatesForCall = params.candidates.slice(0, 6)

    // Build a candidate manifest so GPT-4o knows which photo is which
    const manifest = candidatesForCall.map((c, idx) => {
      const hints: string[] = []
      if (c.bodyVisibility) hints.push(`bodyVisibility=${c.bodyVisibility}`)
      if (c.framing) hints.push(`framing=${c.framing}`)
      if (c.description) hints.push(`description="${c.description.slice(0, 100)}"`)
      const hintStr = hints.length > 0 ? ` (${hints.join(', ')})` : ''
      return `Image ${idx + 2}: candidate id=${c.id}${hintStr}`
    }).join('\n')

    // Build an explicit "avoid" rule from the product text — if product is
    // jeans, tell GPT-4o NOT to pick jeans-wearing photos. This is the
    // backstop for the compatibility rule in the system prompt.
    const productLower = (params.productText || '').toLowerCase()
    const avoidKeywords: string[] = []
    if (/\b(jeans|denim|trouser|pant|chino|jogger)\b/.test(productLower)) {
      avoidKeywords.push('photos where she is already wearing jeans, denim, or similar long pants — pick photos with skirts, shorts, leggings, or dresses instead')
    } else if (/\b(skirt)\b/.test(productLower)) {
      avoidKeywords.push('photos where she is already wearing a similar skirt')
    } else if (/\b(saree|sari|lehenga)\b/.test(productLower)) {
      avoidKeywords.push('photos where she is already wearing a saree or lehenga')
    } else if (/\b(dress|gown|frock)\b/.test(productLower)) {
      avoidKeywords.push('photos where she is already wearing a similar dress')
    } else if (/\b(jacket|blazer|cardigan|hoodie)\b/.test(productLower)) {
      avoidKeywords.push('photos where she is already wearing similar outerwear')
    } else if (/\b(shirt|t.?shirt|tee|blouse|top|tank|kurti)\b/.test(productLower)) {
      // Optional: extract color if mentioned
      const colorMatch = productLower.match(/\b(white|black|red|blue|green|yellow|pink|brown|beige|cream|navy|olive)\b/)
      if (colorMatch) {
        avoidKeywords.push(`photos where she is already wearing a ${colorMatch[1]}-colored top — pick photos where her top is a different color so the swap is visually obvious`)
      }
    }

    const avoidClause = avoidKeywords.length > 0
      ? `\n\nIMPORTANT: For this specific product, AVOID picking ${avoidKeywords.join('; ')}. If you pick a photo where the existing clothing already matches the product, the swap will be visually invisible and the user sees nothing changed.\n`
      : ''

    // GRAPHIC-PLACEMENT MATCHING — when the product's main design is on
    // the BACK, the orchestrator must prefer back-facing / 3-quarter-back
    // influencer photos so the print is actually visible in the output.
    let graphicClause = ''
    if (params.graphicPlacement === 'back') {
      graphicClause =
        `\n\nGRAPHIC PLACEMENT: This product's main graphic/print is on the BACK of the garment. ` +
        `STRONGLY PREFER candidate photos where the influencer is facing AWAY from the camera, or in a 3/4-back / side pose where the back is visible. ` +
        `A back graphic is invisible on a front-facing photo. ` +
        `In the prompt for back-facing photos, explicitly say "render the back graphic clearly visible across the upper back". ` +
        `If you are FORCED to use a front-facing photo, say in its prompt "the model faces forward so the plain front of the shirt is shown; the back graphic is not visible from this angle" — never invent the back graphic onto the front.\n`
    } else if (params.graphicPlacement === 'front') {
      graphicClause =
        `\n\nGRAPHIC PLACEMENT: The product's main graphic is on the FRONT. Prefer front-facing or 3/4-front candidate photos so the print shows.\n`
    }

    // STYLED-LOOK CLAUSE — when the product photo shows the item worn as
    // part of a complete outfit (e.g. an open shirt over a crop top with
    // jeans), recreate the WHOLE look, not just the product in isolation.
    const vTop = (params.visibleTopInPhoto || '').trim()
    const vBottom = (params.visibleBottomInPhoto || '').trim()
    const companions: string[] = []
    if (vTop && !/^none$/i.test(vTop)) companions.push(`inner/top layer: ${vTop}`)
    if (vBottom && !/^none$/i.test(vBottom)) companions.push(`bottom: ${vBottom}`)
    const styledLookClause = companions.length > 0
      ? `\n\nSTYLED LOOK: Image 1 shows the product worn as a complete outfit. Besides the main product, the look includes — ${companions.join('; ')}. ` +
        `In EVERY prompt, dress the influencer in the COMPLETE styled outfit: the main product PLUS these companion pieces, recreating the full look from Image 1. ` +
        `Do not output the product in isolation — reproduce the whole styled outfit (e.g. the print shirt worn open over the ${vTop || 'inner top'}${vBottom ? `, with ${vBottom}` : ''}).\n`
      : ''

    const userContent: any[] = [
      {
        type: 'text',
        text: `${params.productText ? `Product: ${params.productText.slice(0, 200)}\n\n` : ''}${params.garmentSummary ? `Garment summary: ${params.garmentSummary.slice(0, 200)}\n\n` : ''}Candidate photos manifest:\n${manifest}${avoidClause}${graphicClause}${styledLookClause}\n\nIMPORTANT REGION LOCK: if the product is an upper-body garment, preserve the influencer's original pants, shoes, and lower-body styling from their own photo. If the product is a lower-body garment, preserve the influencer's original top and upper-body styling. Never copy companion garments from the product model unless the sold product itself clearly includes them.\n\nLook at the garment (Image 1) and each candidate (Images 2-${candidatesForCall.length + 1}). Pick the 3 best photos for this swap and write a FLUX prompt for each. Return JSON only.`,
      },
      // Image 1 = the garment
      {
        type: 'image_url',
        image_url: {
          url: `data:${detectImageMime(params.garmentBase64)};base64,${params.garmentBase64}`,
          detail: 'high',
        },
      },
      // Images 2..N = candidate photos.
      // detail: 'high' — the compatibility filter (which existing-clothing
      // matches the product → invisible swap) is the #1 quality mechanism.
      // At 'low' detail GPT-4o sees ~85-token thumbnails and cannot reliably
      // read top/bottom type and colour, so it mis-picks photos. 'high'
      // costs more tokens but the selection accuracy is worth it.
      ...candidatesForCall.map((c) => ({
        type: 'image_url' as const,
        image_url: {
          url: c.imageUrl,
          detail: 'high' as const,
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
      candidateDescriptions?: Array<{ photoId?: string; currentClothing?: string }>
      selections?: Array<{ photoId?: string; prompt?: string; reasoning?: string; currentClothing?: string }>
    }

    if (!Array.isArray(parsed.selections) || parsed.selections.length === 0) {
      throw new Error('Orchestrator returned no selections')
    }

    // Build a lookup of currentClothing per photoId from the descriptions block
    const clothingByPhotoId = new Map<string, string>()
    if (Array.isArray(parsed.candidateDescriptions)) {
      for (const d of parsed.candidateDescriptions) {
        if (d.photoId && d.currentClothing) {
          clothingByPhotoId.set(d.photoId, d.currentClothing.toLowerCase())
        }
      }
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
        reasoning: String(sel.reasoning || '').slice(0, 300),
        currentClothing: clothingByPhotoId.get(sel.photoId) || sel.currentClothing,
      })
      if (cleanSelections.length >= 3) break
    }

    // ── DETERMINISTIC COMPATIBILITY CHECK ─────────────────────────────
    // Even with the system-prompt rule, GPT-4o sometimes picks photos
    // that fail the compatibility filter. Catch those here using the
    // currentClothing description it generated itself.
    const productLower2 = (params.productText || '').toLowerCase()
    const flagsToCheck: Array<{ pattern: RegExp; productMatches: RegExp; label: string }> = [
      { productMatches: /\b(jeans|denim|trouser|chino|jogger)\b/, pattern: /\b(jeans|denim)\b/, label: 'jeans' },
      { productMatches: /\b(saree|sari)\b/, pattern: /\b(saree|sari)\b/, label: 'saree' },
      { productMatches: /\b(lehenga)\b/, pattern: /\b(lehenga)\b/, label: 'lehenga' },
    ]

    for (const flag of flagsToCheck) {
      if (!flag.productMatches.test(productLower2)) continue
      // Product matches this category. Now check each selection.
      const violators = cleanSelections.filter((s) =>
        s.currentClothing && flag.pattern.test(s.currentClothing)
      )
      if (violators.length > 0 && isDev) {
        console.warn(
          `⚠️ Orchestrator picked ${violators.length} photo(s) where she's already wearing ${flag.label}: ` +
          violators.map((v) => `${v.photoId.slice(0, 8)}="${v.currentClothing?.slice(0, 60)}"`).join(', ')
        )
      }
      // For each violator, try to substitute from the non-violator candidate pool
      if (violators.length > 0) {
        const nonViolatorIds = new Set(
          candidatesForCall
            .filter((c) => {
              const cc = clothingByPhotoId.get(c.id)
              return cc && !flag.pattern.test(cc)
            })
            .map((c) => c.id)
        )
        const currentIds = new Set(cleanSelections.map((s) => s.photoId))
        for (const v of violators) {
          const substitute = candidatesForCall.find(
            (c) => nonViolatorIds.has(c.id) && !currentIds.has(c.id)
          )
          if (substitute) {
            const subClothing = clothingByPhotoId.get(substitute.id)
            const idx = cleanSelections.findIndex((s) => s.photoId === v.photoId)
            if (idx >= 0) {
              if (isDev) console.log(`   ↪ Substituting ${v.photoId.slice(0, 8)} → ${substitute.id.slice(0, 8)} ("${subClothing}")`)
              // Reuse the original prompt but swap the photoId and clothing
              cleanSelections[idx] = {
                ...cleanSelections[idx],
                photoId: substitute.id,
                currentClothing: subClothing,
                reasoning: `Substituted by compatibility filter — original pick had matching ${flag.label}; this candidate wears: ${subClothing}`,
              }
              currentIds.delete(v.photoId)
              currentIds.add(substitute.id)
            }
          }
        }
      }
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
