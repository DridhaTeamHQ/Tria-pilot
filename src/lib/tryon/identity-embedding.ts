/**
 * IDENTITY EMBEDDING (Soul ID)
 * 
 * Creates a persistent face "fingerprint" per influencer by analyzing
 * ALL their uploaded face images TOGETHER — not just one.
 * 
 * Inspired by Higgsfield Soul ID:
 * - Multiple angles give more accurate geometry
 * - Cross-referenced features (seen from 2+ angles) are more reliable
 * - Produces a frozen "Identity DNA" prompt used in every generation
 * 
 * This runs ONCE per image set change (not on every generation).
 * Result is stored in influencer_profiles.identity_embedding.
 */

import 'server-only'
import { createServiceClient } from '@/lib/auth'
import { getOpenAI } from '@/lib/openai'

const FORENSIC_MODEL = process.env.TRYON_FORENSIC_PROMPT_MODEL?.trim() || 'gpt-4o'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface IdentityEmbedding {
  // ─── Face Geometry (immutable) ─────────────────────────────────────
  faceShape: string          // "oval with soft jaw, moderate width"
  eyeGeometry: string        // "almond, dark brown, 32mm spacing"
  noseProfile: string        // "straight bridge, rounded tip"
  lipContour: string         // "full, defined cupid's bow"
  jawline: string            // "soft round jaw, slight chin point"
  skinTone: string           // "warm medium brown, golden undertone"
  skinTexture: string        // "smooth with light forehead texture"
  distinguishingMarks: string // "mole below left eye" or "none"

  // ─── Variable but Consistent ───────────────────────────────────────
  hairDescription: string    // "long black wavy, center-parted"
  bodyBuild: string          // "medium build, proportionate shoulders"
  eyewear: string            // "rectangular wire-frame glasses" or "none"

  // ─── Identity DNA (frozen prompt paragraph) ────────────────────────
  // Used DIRECTLY in every generation prompt as the IDENTITY section.
  // This is the money line — the single paragraph that anchors the face.
  identityDNA: string

  // ─── Composed Anchors (for prompt sections) ────────────────────────
  faceAnchor: string         // Short face description for prompts
  eyesAnchor: string         // Short eyes description for prompts
  bodyAnchor: string         // Short body description for prompts

  // ─── Source Metadata ───────────────────────────────────────────────
  imageCount: number         // How many images were analyzed
  imageTypes: string[]       // Which image types were used
  extractedAt: string        // ISO timestamp
  modelUsed: string          // GPT-4o version used
  version: number            // Schema version for future upgrades
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract identity embedding from ALL of a user's face images.
 * This is the "Soul ID" — a comprehensive face fingerprint.
 * 
 * Key difference from old character-metadata: analyzes MULTIPLE images
 * together for cross-referenced, more accurate descriptions.
 */
export async function extractIdentityEmbedding(
  userId: string
): Promise<IdentityEmbedding | null> {
  const isDev = process.env.NODE_ENV !== 'production'

  try {
    const service = createServiceClient()

    // Find the influencer profile
    const { data: profile } = await service
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile) {
      if (isDev) console.log('🧬 No influencer profile found for identity extraction')
      return null
    }

    // Get ALL active identity images
    const { data: images } = await service
      .from('identity_images')
      .select('image_type, image_url')
      .eq('influencer_profile_id', profile.id)
      .eq('is_active', true)
      .order('image_type')

    if (!images || images.length === 0) {
      if (isDev) console.log('🧬 No identity images available')
      return null
    }

    if (isDev) console.log(`🧬 Extracting identity embedding from ${images.length} images...`)

    // Download all images as base64 (in parallel, limit to 6 to avoid memory issues)
    const imagesToAnalyze = images.slice(0, 6)
    const imageDataArray = await Promise.all(
      imagesToAnalyze.map(async (img: any) => {
        try {
          const resp = await fetch(img.image_url)
          if (!resp.ok) return null
          const buffer = await resp.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          return {
            type: img.image_type as string,
            dataUrl: `data:image/jpeg;base64,${base64}`,
          }
        } catch {
          return null
        }
      })
    )

    const validImages = imageDataArray.filter(Boolean) as { type: string; dataUrl: string }[]
    if (validImages.length === 0) {
      if (isDev) console.log('🧬 Failed to download any identity images')
      return null
    }

    if (isDev) console.log(`🧬 Analyzing ${validImages.length} images with GPT-4o...`)

    // Run multi-image GPT-4o analysis
    const embedding = await analyzeMultipleImages(validImages)
    if (!embedding) return null

    // Store in DB
    const { error: updateError } = await service
      .from('influencer_profiles')
      .update({
        identity_embedding: embedding,
        character_metadata: embedding, // Also update old field for backward compat
        character_metadata_updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Failed to store identity embedding:', updateError)
    } else if (isDev) {
      console.log(`🧬 Identity embedding stored (${validImages.length} images, v${embedding.version})`)
    }

    return embedding
  } catch (err) {
    console.error('Identity embedding extraction error:', err)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-IMAGE GPT-4o ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

async function analyzeMultipleImages(
  images: { type: string; dataUrl: string }[]
): Promise<IdentityEmbedding | null> {
  const openai = getOpenAI()

  // Build content array with ALL images
  const content: any[] = [
    {
      type: 'text',
      text: `You are analyzing ${images.length} photos of the SAME person from different angles.
Your job: Create a PERMANENT identity profile by cross-referencing features across all views.

Features confirmed in 2+ images are marked as high-confidence.
Features visible in only 1 image should still be noted but may be angle-dependent.

CRITICAL: You MUST also write an "identityDNA" paragraph — a single, dense paragraph 
that describes this person's EXACT face so precisely that an AI image generator could 
reproduce it perfectly. This paragraph will be used in EVERY image generation for this person.

The identityDNA should read like:
"This person has a [shape] face with [width] proportions, [cheek description], [jawline], 
and [chin]. Their [eye shape] eyes are [color] with [spacing] spacing. The nose has a 
[bridge] bridge and [tip] tip. Lips are [description]. Skin is [tone] with [texture]. 
[Hair description]. [Any distinguishing marks]."

Return JSON only:
{
  "faceShape": "<shape + width + proportions — be specific>",
  "eyeGeometry": "<shape, color, spacing, crease, brow>",
  "noseProfile": "<bridge width + tip shape + nostril visibility>",
  "lipContour": "<fullness + shape + defining features>",
  "jawline": "<jaw shape + angle + chin>",
  "skinTone": "<specific tone + warmth/coolness + undertone>",
  "skinTexture": "<smoothness + pore visibility + any texture>",
  "distinguishingMarks": "<moles, dimples, scars, beauty marks — or 'none'>",
  "hairDescription": "<length + color + texture + parting>",
  "bodyBuild": "<shoulder width + build + overall frame>",
  "eyewear": "<frame description or 'none'>",
  "identityDNA": "<THE CRITICAL PARAGRAPH — 2-3 sentences describing this exact face>"
}

Rules:
- Cross-reference across all ${images.length} images for accuracy.
- Face width and cheek volume are the #1 source of AI face drift — be PRECISE.
- The identityDNA paragraph must be specific enough to distinguish this person from anyone else.
- Do NOT mention name, age, ethnicity, or sensitive attributes.
- Keep each field concise but precise.
- The identityDNA is the most important output — it will be used in every generation.`,
    },
  ]

  // Add each image with its type label
  for (let i = 0; i < images.length; i++) {
    content.push(
      {
        type: 'text',
        text: `Photo ${i + 1} (${images[i].type}):`,
      },
      {
        type: 'image_url',
        image_url: {
          url: images[i].dataUrl,
          detail: 'low', // Save tokens — we're analyzing geometry, not pixel details
        },
      }
    )
  }

  const response = await openai.chat.completions.create({
    model: FORENSIC_MODEL,
    messages: [{ role: 'user', content }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 800,
  })

  const raw = response.choices[0]?.message?.content || '{}'
  const parsed = JSON.parse(raw) as Record<string, string>

  if (!parsed.identityDNA) {
    console.error('🧬 GPT-4o did not return identityDNA — extraction failed')
    return null
  }

  // Compose prompt anchors
  const faceAnchor = [
    parsed.faceShape || null,
    parsed.jawline || null,
    parsed.skinTone ? `${parsed.skinTone} skin` : null,
    parsed.skinTexture || null,
    parsed.noseProfile || null,
    parsed.lipContour || null,
    parsed.distinguishingMarks && parsed.distinguishingMarks !== 'none'
      ? parsed.distinguishingMarks : null,
  ].filter(Boolean).join(', ')

  const eyesAnchor = parsed.eyeGeometry || 'preserve exact eye geometry and color'

  const bodyAnchor = parsed.bodyBuild
    ? `preserve ${parsed.bodyBuild} — do not slim, reshape, or idealize the body`
    : 'preserve original body build, weight, shoulder width, and proportions exactly'

  const embedding: IdentityEmbedding = {
    faceShape: parsed.faceShape || 'unknown',
    eyeGeometry: parsed.eyeGeometry || 'unknown',
    noseProfile: parsed.noseProfile || 'unknown',
    lipContour: parsed.lipContour || 'unknown',
    jawline: parsed.jawline || 'unknown',
    skinTone: parsed.skinTone || 'unknown',
    skinTexture: parsed.skinTexture || 'unknown',
    distinguishingMarks: parsed.distinguishingMarks || 'none',
    hairDescription: parsed.hairDescription || 'unknown',
    bodyBuild: parsed.bodyBuild || 'unknown',
    eyewear: parsed.eyewear || 'none',
    identityDNA: parsed.identityDNA,
    faceAnchor,
    eyesAnchor,
    bodyAnchor,
    imageCount: images.length,
    imageTypes: images.map(i => i.type),
    extractedAt: new Date().toISOString(),
    modelUsed: FORENSIC_MODEL,
    version: 1,
  }

  return embedding
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOADER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Load stored identity embedding for a user.
 * Returns null if no embedding exists yet.
 */
export async function loadIdentityEmbedding(
  userId: string
): Promise<IdentityEmbedding | null> {
  try {
    const service = createServiceClient()

    const { data: profile } = await service
      .from('influencer_profiles')
      .select('identity_embedding')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile?.identity_embedding) return null

    return profile.identity_embedding as IdentityEmbedding
  } catch (err) {
    console.error('Failed to load identity embedding:', err)
    return null
  }
}

/**
 * Check if identity embedding needs re-extraction.
 * Returns true if no embedding exists or image count has changed.
 */
export async function needsReExtraction(
  userId: string
): Promise<boolean> {
  try {
    const service = createServiceClient()

    const { data: profile } = await service
      .from('influencer_profiles')
      .select('id, identity_embedding')
      .eq('user_id', userId)
      .maybeSingle()

    if (!profile) return false
    if (!profile.identity_embedding) return true

    const embedding = profile.identity_embedding as IdentityEmbedding

    // Check if image count has changed
    const { count } = await service
      .from('identity_images')
      .select('id', { count: 'exact', head: true })
      .eq('influencer_profile_id', profile.id)
      .eq('is_active', true)

    if (count !== null && count !== embedding.imageCount) return true

    return false
  } catch {
    return false
  }
}
