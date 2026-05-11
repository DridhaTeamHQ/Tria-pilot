import { GoogleGenAI, type ImageConfig, type GenerateContentConfig, type ContentListUnion } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'
import { geminiGenerateContent } from '@/lib/gemini/executor'

// Initialize the Google GenAI client
const getClient = () => {
  const apiKey = getGeminiKey()
  return new GoogleGenAI({ apiKey })
}

export interface TryOnOptions {
  personImage: string // base64 (with or without data URI prefix) - primary image
  personImages?: string[] // Optional: additional person images for Pro model
  editType?: 'clothing_change' | 'background_change' | 'lighting_change' | 'pose_change' | 'camera_change'
  clothingImage?: string // base64 - garment reference (may include face; must be ignored)
  backgroundImage?: string // base64 - background reference (optional)
  accessoryImages?: string[] // NEW: base64 images of accessories (purse, shoes, hat, etc.)
  accessoryTypes?: ('purse' | 'shoes' | 'hat' | 'jewelry' | 'bag' | 'watch' | 'sunglasses' | 'scarf' | 'other')[] // NEW: type labels for each accessory
  prompt: string // strict edit prompt built by templates
  model?: 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview'
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  resolution?: '1K' | '2K' | '4K' // Pro model only
  // NEW: Text-based scene/background description (for presets)
  sceneDescription?: string // e.g. "Golden hour in open fields with warm natural light"
  lightingDescription?: string // e.g. "Soft warm golden hour light"
  garmentDescription?: string // Detailed garment description (from GPT-4o mini)
  background?: string
  pose?: string
  expression?: string
}

/**
 * Generate virtual try-on image using Gemini image generation models
 * 
 * CRITICAL: Face consistency is the #1 priority.
 * The person image face MUST be preserved exactly.
 * Any face in clothing reference MUST be completely ignored.
 */
export async function generateTryOn(options: TryOnOptions): Promise<string> {
  const {
    personImage,
    personImages = [],
    editType = 'clothing_change',
    clothingImage,
    backgroundImage,
    accessoryImages = [],
    accessoryTypes = [],
    prompt,
    model = 'gemini-3.1-flash-image-preview',
    aspectRatio = '4:5',
    resolution = '2K',
    sceneDescription,
    lightingDescription,
    garmentDescription,
  } = options

  const isDev = process.env.NODE_ENV !== 'production'
  try {
    if (isDev) {
      console.log('🎨 Starting Gemini image generation...')
      console.log(`Model: ${model}, Aspect Ratio: ${aspectRatio}, Resolution: ${resolution}`)
    }

    const contents: ContentListUnion = []
    const isPro = model === 'gemini-3-pro-image-preview'

    // Clean person image
    const cleanPersonImage = personImage.replace(/^data:image\/[a-z]+;base64,/, '')
    if (!cleanPersonImage || cleanPersonImage.length < 100) {
      throw new Error('Invalid person image: image data is too short or empty')
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SIMPLE DIRECT APPROACH - Nano Banana "this person" method
    // Key insight: Simple prompts work better than complex JSON
    // ═══════════════════════════════════════════════════════════════════════

    // STEP 1: Person image FIRST (this establishes "this person")
    contents.push({
      inlineData: {
        data: cleanPersonImage,
        mimeType: 'image/jpeg',
      },
    } as any)
    if (isDev) console.log('📸 Added person image (identity source)')

    // STEP 2: Build simple, direct prompt
    const hasSceneChange = !!sceneDescription
    const hasClothingChange = !!clothingImage
    const hasLightingChange = !!lightingDescription

    // Prefer explicit garment description (so clothing doesn't get ignored)
    // Fallback: try to parse legacy prompt text
    let garmentDesc = (garmentDescription || '').trim()
    if (!garmentDesc) {
      garmentDesc = "the garment shown in the clothing reference image"
      if (prompt && prompt.includes('GARMENT:')) {
        const match = prompt.match(/GARMENT:\s*([^\n]+)/)
        if (match) garmentDesc = match[1].trim()
      }
    }

    // Build simple instruction with EXACT emphasis for BOTH face AND clothing
    // ═══════════════════════════════════════════════════════════════════════
    // CONSISTENT TRY-ON PIPELINE
    // LOCKED (NEVER CHANGE): Face, Pose, Body Position, Hair
    // EDITABLE: Clothing, Background, Lighting
    // ═══════════════════════════════════════════════════════════════════════

    // Generate unique identity anchor for this session
    const identityAnchor = `SUBJECT-${Date.now().toString(36).toUpperCase()}`

    let simplePrompt: string

    if (isPro) {
      // PRO MODEL: "Context Lock" technique
      simplePrompt = `VIRTUAL TRY-ON PIPELINE - PRO MODE

═══════════════════════════════════════════════════════════════════════════════
🔒 LOCKED ELEMENTS (NEVER CHANGE - COPY EXACTLY FROM FIRST IMAGE):
═══════════════════════════════════════════════════════════════════════════════
The person in the FIRST image is "${identityAnchor}".

FACE (LOCKED - MATCH EXACTLY):
• Face shape, jawline, and bone structure - EXACT MATCH
• Eyes: shape, color, size, spacing - EXACT MATCH
• Nose: bridge width, tip shape - EXACT MATCH  
• Lips: shape, thickness, color - EXACT MATCH
• Skin tone and complexion - EXACT MATCH
• Any moles, marks, or features - EXACT MATCH
• Eyebrows: shape and thickness - EXACT MATCH
• Hair: color, texture, style - EXACT MATCH

POSE (LOCKED - DO NOT CHANGE):
• Body position - EXACT SAME as original
• Arm positions and hand placement - EXACT SAME
• Head angle and tilt - EXACT SAME  
• Body orientation - EXACT SAME
• Expression - natural, similar to original

═══════════════════════════════════════════════════════════════════════════════
✏️ EDITABLE ELEMENTS (WHAT TO CHANGE):
═══════════════════════════════════════════════════════════════════════════════
`
      if (hasClothingChange) {
        simplePrompt += `CLOTHING (EDIT): Replace ${identityAnchor}'s outfit with the EXACT garment from clothing reference.
• Match exact color, pattern, and design from reference
• Natural fabric draping on ${identityAnchor}'s body
• Garment: ${garmentDesc}

`
      }
      if (hasSceneChange) {
        simplePrompt += `BACKGROUND (EDIT): Change background to: ${sceneDescription}
• Keep ${identityAnchor} in exact same pose
• Blend lighting naturally with scene

`
      }
      if (hasLightingChange) {
        simplePrompt += `LIGHTING (EDIT): Apply ${lightingDescription}
• Natural shadows on ${identityAnchor}
• Consistent light direction

`
      }

      simplePrompt += `
═══════════════════════════════════════════════════════════════════════════════
OUTPUT VERIFICATION:
═══════════════════════════════════════════════════════════════════════════════
Before outputting, verify:
✓ Face matches "${identityAnchor}" exactly - their family would recognize them
✓ Pose is unchanged from original photo
✓ Clothing matches reference exactly (if applicable)
✓ Image looks like real photograph, not AI-generated

QUALITY: Shot on 85mm lens, visible skin pores, natural lighting, no AI smoothing.
`
    } else {
      // FLASH MODEL: "The Reminders" technique - repeat face check in every section
      simplePrompt = `VIRTUAL TRY-ON PIPELINE - FLASH MODE

═══════════════════════════════════════════════════════════════════════════════
🔒 LOCKED ELEMENTS (COPY EXACTLY FROM FIRST IMAGE):
═══════════════════════════════════════════════════════════════════════════════
FACE - LOCKED: EXACT same face from first image
• Same eyes, nose, lips, jawline, skin tone
• Same hair color and style
POSE - LOCKED: EXACT same body position
• Same arm positions, head angle, orientation

═══════════════════════════════════════════════════════════════════════════════
✏️ EDITABLE ELEMENTS:
═══════════════════════════════════════════════════════════════════════════════
`
      if (hasClothingChange) {
        simplePrompt += `CLOTHING (EDIT): Replace with garment from reference: ${garmentDesc}
⚠️ REMINDER: Face LOCKED - use EXACT face from first image

`
      }
      if (hasSceneChange) {
        simplePrompt += `BACKGROUND (EDIT): ${sceneDescription}
⚠️ REMINDER: Face LOCKED, Pose LOCKED - only change background

`
      }
      if (hasLightingChange) {
        simplePrompt += `LIGHTING (EDIT): ${lightingDescription}
⚠️ REMINDER: Face LOCKED - same person as first image

`
      }

      simplePrompt += `
═══════════════════════════════════════════════════════════════════════════════
FINAL CHECK:
═══════════════════════════════════════════════════════════════════════════════
🔒 Face = EXACT match to first image (locked)
🔒 Pose = EXACT same position (locked)
✏️ Clothing = from reference (edited)
✏️ Background = as specified (edited)

QUALITY: Realistic photograph, visible skin texture, natural lighting.
`
    }

    // ANTI-DRIFT NEGATIVE PROMPTING (works for both models)
    simplePrompt += `
NEGATIVE PROMPT - FORBIDDEN:
❌ Different face or person
❌ Changed facial structure  
❌ Different eye shape or color
❌ Altered skin tone
❌ Changed pose or body position
❌ Smooth/plastic AI skin
❌ HDR halos or artificial glow
`

    if (hasClothingChange) {
      simplePrompt += `\nClothing reference (EXACT garment to apply - match color, pattern, design):`
    }

    contents.push(simplePrompt)
    if (isDev) console.log(`📝 Added ${isPro ? 'PRO Context Lock' : 'FLASH Reminders'} face instruction`)

    // STEP 3: Clothing reference image
    if (clothingImage) {
      const cleanClothingImage = clothingImage.replace(/^data:image\/[a-z]+;base64,/, '')
      if (cleanClothingImage && cleanClothingImage.length >= 100) {
        contents.push({
          inlineData: {
            data: cleanClothingImage,
            mimeType: 'image/jpeg',
          },
        } as any)
        if (isDev) console.log('👕 Added garment reference image')
      }
    }

    // STEP 4: Background reference image (if provided)
    if (backgroundImage) {
      const cleanBgImage = backgroundImage.replace(/^data:image\/[a-z]+;base64,/, '')
      if (cleanBgImage && cleanBgImage.length >= 100) {
        contents.push('Background reference:')
        contents.push({
          inlineData: {
            data: cleanBgImage,
            mimeType: 'image/jpeg',
          },
        } as any)
        if (isDev) console.log('🖼️ Added background reference image')
      }
    }

    // STEP 5: Final reinforcement with verification checkpoint
    contents.push(`
FINAL OUTPUT VERIFICATION CHECKLIST:
✓ IDENTITY CHECK: Face in output matches face in FIRST image exactly
✓ POSE CHECK: Body position unchanged from original photo
✓ GARMENT CHECK: Clothing matches reference exactly (color, pattern, design)
✓ REALISM CHECK: Image looks like real photograph, not AI-generated

VERIFY BEFORE OUTPUT:
Does the face match the person in the first image? Their family must recognize them.
Is the skin natural (visible pores, texture) not plastic/smooth?
Is the lighting realistic and consistent?

CANDID PHOTO QUALITY:
• Shot on 85mm lens with natural bokeh
• Skin has visible pores and natural texture
• Slight natural imperfections (not over-processed)
• No HDR halos, no artificial glow
• Shadows are soft and realistic
• Colors are natural, not over-saturated

OUTPUT: High-quality realistic photograph of the SAME PERSON from the first image.`)

    // STEP 5: Add accessories if any
    if (accessoryImages.length > 0) {
      const accessoryLabels = accessoryTypes.length > 0 ? accessoryTypes : accessoryImages.map(() => 'accessory')
      accessoryImages.slice(0, 4).forEach((image, idx) => {
        const cleanAccessory = image.replace(/^data:image\/[a-z]+;base64,/, '')
        if (cleanAccessory && cleanAccessory.length >= 100) {
          const label = accessoryLabels[idx] || `accessory_${idx + 1}`
          contents.push(`Also add this ${label}:`)
          contents.push({
            inlineData: {
              data: cleanAccessory,
              mimeType: 'image/jpeg',
            },
          } as any)
          if (isDev) console.log(`👜 Added accessory: ${label}`)
        }
      })
    }

    // No need for repeated images - Nano Banana understands "this person" from the first image

    if (isDev) console.log('✅ Contents prepared')

    // Build image config
    const imageConfig = {
      aspectRatio: aspectRatio,
      personGeneration: 'allow_adult',
    } as ImageConfig

    if (model === 'gemini-3-pro-image-preview' && resolution) {
      imageConfig.imageSize = resolution as any
    }

    // Build generation config
    const config: GenerateContentConfig = {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig,
    }

    if (isDev) console.log('📡 Sending generation request to Gemini...')
    const startTime = Date.now()

    // Generate content
    const response = await geminiGenerateContent({
      model,
      contents,
      config,
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    if (isDev) console.log(`✅ Gemini responded in ${duration}s`)

    // Extract image from response
    if (response.data) {
      if (isDev) console.log('✅ Image extracted from response.data')
      return `data:image/png;base64,${response.data}`
    }

    // Check candidates for inline data
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            if (isDev) console.log(`✅ Image extracted from candidates (${part.inlineData.mimeType})`)
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          }
        }
      }
    }

    console.error('❌ No image found in Gemini response')
    throw new Error('No image generated by Gemini')
  } catch (error) {
    console.error('❌ Gemini image generation error:', error)

    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        throw new Error('Gemini API key is invalid or missing.')
      } else if (error.message.includes('quota')) {
        throw new Error('Gemini API quota exceeded. Please try again later.')
      } else if (
        error.message.includes('504') ||
        error.message.toLowerCase().includes('deadline exceeded') ||
        error.message.toLowerCase().includes('deadline expired') ||
        error.message.includes('timeout')
      ) {
        throw new Error('Gemini API timed out (server overloaded). Please try again in a moment.')
      } else if (error.message.includes('Invalid person image')) {
        throw error
      }
      throw new Error(`Gemini generation failed: ${error.message}`)
    }

    throw new Error('Failed to generate image with Gemini')
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DIRECT TRANSPORT LAYER (for Nano Banana Pro pipeline)
// ═══════════════════════════════════════════════════════════════════════

export interface DirectTryOnOptions {
  personImageBase64: string   // raw base64 (no data URI prefix)
  garmentImageBase64: string  // raw base64 (no data URI prefix)
  faceCropBase64?: string     // output of extractFaceCrop (raw base64)
  characterReferenceBase64s?: { base64: string; label: string }[]  // multi-angle character references
  model?: 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview'
  prompt: string              // pre-built sanitized prompt — passed AS-IS
  aspectRatio?: string
  resolution?: string
  /**
   * Optional structured garment analysis. When supplied, the FLUX engine
   * uses it to build a concrete, garment-specific prompt for higher
   * fidelity (color, pattern, material, fit, neckline, sleeves). The
   * Gemini engine ignores this field and uses `prompt` directly.
   */
  garmentIntel?: import('@/lib/tryon/garment-intel').GarmentIntelligence | null
  /**
   * Optional strict garment profile (hex colors, motif descriptions,
   * fabric specs). When the preprocessor extracts the garment from a
   * person-on-product image, this profile is also computed. FLUX uses
   * the hex color + motif description to lock pattern fidelity.
   */
  strictGarmentProfile?: import('@/lib/tryon/garment-strict-schema').StrictGarmentProfile | null
  /**
   * FLUX-only: prompt detail level. 'detailed' (default) uses the full
   * fact-sheet prompt; 'simple' uses a stripped prompt for fallback
   * attempts when the detailed version triggers empty responses.
   */
  promptMode?: 'detailed' | 'simple'
  /**
   * FLUX-only: override the model for this single call. Used by the
   * reliability chain to retry on -flex after -pro fails.
   */
  modelOverride?: 'flux-2-max' | 'flux-2-pro' | 'flux-2-flex'
  /** FLUX-only: seed for reproducibility / re-roll diversity. */
  seed?: number
  /**
   * FLUX-only: when true, `prompt` is the COMPLETE FLUX prompt (e.g.
   * written by an orchestrator) — skip template building.
   */
  useExplicitPrompt?: boolean
}

/**
 * Thin transport layer for the Nano Banana Pro pipeline.
 *
 * Engine routing:
 *   When TRYON_ENGINE=flux (or unset and FLUX_API_KEY is configured),
 *   delegates to FLUX.2 [pro]. Otherwise falls through to the Gemini
 *   pipeline below.
 *
 * Both engines accept the same shape and return a base64 data-URL
 * string. The caller (api/tryon/route.ts) doesn't need to know which
 * engine ran.
 *
 * CRITICAL: This function does NOT build any prompt internally for the
 * Gemini path — the prompt argument is passed DIRECTLY to Gemini.
 * Content order: [person_image, garment_image, face_crop, character_refs, prompt_text]
 */
export async function generateTryOnDirect(options: DirectTryOnOptions): Promise<string> {
  // Engine selection. Defaults to 'flux' when FLUX_API_KEY is set,
  // 'gemini' otherwise. Override with TRYON_ENGINE=gemini|flux.
  const explicitEngine = (process.env.TRYON_ENGINE || '').trim().toLowerCase()
  const fluxKeyConfigured = Boolean((process.env.FLUX_API_KEY || '').trim())
  const engine =
    explicitEngine === 'gemini'
      ? 'gemini'
      : explicitEngine === 'flux'
        ? 'flux'
        : fluxKeyConfigured
          ? 'flux'
          : 'gemini'

  if (engine === 'flux') {
    const { generateTryOnFlux } = await import('@/lib/flux/tryon-engine')
    return generateTryOnFlux({
      personImageBase64: options.personImageBase64,
      garmentImageBase64: options.garmentImageBase64,
      faceCropBase64: options.faceCropBase64,
      prompt: options.prompt,
      aspectRatio: options.aspectRatio,
      resolution: options.resolution,
      garmentIntel: options.garmentIntel ?? null,
      strictGarmentProfile: options.strictGarmentProfile ?? null,
      promptMode: (options as any).promptMode,
      modelOverride: (options as any).modelOverride,
      seed: (options as any).seed,
      useExplicitPrompt: (options as any).useExplicitPrompt,
    })
  }

  // ── Gemini path ───────────────────────────────────────────────────
  const {
    personImageBase64,
    garmentImageBase64,
    model,
    prompt,
    aspectRatio = '4:5',
    resolution = '2K',
  } = options

  // Clean base64
  const cleanPerson = personImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
  const cleanGarment = garmentImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')

  if (!cleanPerson || cleanPerson.length < 100) throw new Error('Invalid person image')
  if (!cleanGarment || cleanGarment.length < 100) throw new Error('Invalid garment image')

  const requestedModel =
    model ||
    process.env.TRYON_RENDER_MODEL?.trim() ||
    process.env.TRYON_IMAGE_MODEL?.trim() ||
    'gemini-3-pro-image-preview'

  const isDev = process.env.VERCEL_ENV ? process.env.VERCEL_ENV !== 'production' : process.env.NODE_ENV !== 'production'

  // Image order: person → garment → face crop (if available) → prompt
  // Image-2 caption is coverage-aware so Gemini understands what kind
  // of garment it's looking at WITHIN the image context, not just in
  // the system instruction (which can drift across attention).
  const intel2 = options.garmentIntel
  const garmentTypeForCaption = (intel2?.garmentType || '').toLowerCase()
  const isFullSetCaption =
    intel2?.coverage === 'full_body' ||
    ['co_ord_set', 'full_outfit', 'jumpsuit', 'suit', 'saree', 'lehenga'].includes(garmentTypeForCaption)
  const isLowerCaption =
    intel2?.coverage === 'lower_only' || /pants|jeans|skirt|trouser|short/.test(garmentTypeForCaption)

  const image2Caption = isFullSetCaption
    ? `Image 2: the target FULL-BODY garment (dress / jumpsuit / set). It covers the entire body.`
    : isLowerCaption
      ? `Image 2: the target LOWER GARMENT (pants / jeans / skirt). It is BOTTOM WEAR ONLY — it covers from waist to ankle. The person's existing TOP in Image 1 must stay unchanged.`
      : `Image 2: the target UPPER GARMENT (top / shirt / blouse / jacket). It is TOP WEAR ONLY — it covers from shoulders to waist/hip. It does NOT extend into a dress. The person's existing BOTTOM WEAR (pants / skirt / jeans) in Image 1 must stay unchanged and visible.`

  const contents: ContentListUnion = [
    { inlineData: { data: cleanPerson, mimeType: 'image/jpeg' } } as any,
    'Image 1: the person. Their pose, face, body, hair, background, framing, and the clothing OUTSIDE the swap region must remain identical in the output.',
    { inlineData: { data: cleanGarment, mimeType: 'image/jpeg' } } as any,
    image2Caption,
  ]

  // Add face crop if provided (Image 3 — definitive identity reference)
  const { faceCropBase64 } = options
  if (faceCropBase64) {
    const cleanFaceCrop = faceCropBase64.replace(/^data:image\/[a-z+]+;base64,/, '')
    if (cleanFaceCrop.length > 100) {
      contents.push(
        { inlineData: { data: cleanFaceCrop, mimeType: 'image/jpeg' } } as any,
        'Image 3: close-up face crop of the same person from Image 1. Use this as the definitive face reference — the output face MUST match this exactly.'
      )
      if (isDev) console.log('\ud83d\udc64 Added face crop as Image 3')
    }
  }

  contents.push(prompt)

  // ── BUILD GARMENT FACT SHEET ─────────────────────────────────────
  // When garmentIntel / strictGarmentProfile are present, we append a
  // structured fact sheet to the system instruction. This gives Gemini
  // concrete specs (hex colors, motif description, fabric, neckline,
  // sleeves, length) that dramatically improve texture + color fidelity
  // versus relying on the model's interpretation of Image 2 alone.
  const intel = options.garmentIntel
  const strict = options.strictGarmentProfile
  const factSheetParts: string[] = []

  if (strict) {
    const baseColor = strict.base_color
    if (baseColor?.name) {
      factSheetParts.push(`• Primary color: ${baseColor.name}${baseColor.hex ? ` (${baseColor.hex})` : ''}`)
    }
    if (strict.secondary_colors?.length) {
      const secs = strict.secondary_colors
        .slice(0, 3)
        .map((c) => `${c.name}${c.hex ? ` (${c.hex})` : ''}`)
        .join(', ')
      factSheetParts.push(`• Secondary colors: ${secs}`)
    }
    if (strict.pattern?.exists && strict.pattern.type !== 'solid') {
      const motif = strict.pattern.motif_description?.slice(0, 100) || ''
      factSheetParts.push(`• Pattern: ${strict.pattern.type}${motif ? ` — ${motif}` : ''} (${strict.pattern.motif_scale} scale, ${strict.pattern.repeat_density} density)`)
    }
    if (strict.fabric?.material && strict.fabric.material !== 'other') {
      factSheetParts.push(`• Fabric: ${strict.fabric.material}, ${strict.fabric.weight} weight, ${strict.fabric.surface_finish.replace('_', ' ')} finish, ${strict.fabric.drape} drape`)
    }
    const c = strict.construction
    if (c?.neckline && c.neckline !== 'other') factSheetParts.push(`• Neckline: ${c.neckline}`)
    if (c?.sleeves?.length) factSheetParts.push(`• Sleeves: ${c.sleeves.length}${c.sleeves.style && c.sleeves.style !== 'straight' ? `, ${c.sleeves.style}` : ''}`)
    if (c?.length) factSheetParts.push(`• Length: ${c.length.replace(/_/g, ' ')}`)
    if (c?.waist && c.waist !== 'straight') factSheetParts.push(`• Waist: ${c.waist}`)
  } else if (intel) {
    if (intel.primaryColor) factSheetParts.push(`• Primary color: ${intel.primaryColor}${intel.secondaryColor ? ` with ${intel.secondaryColor}` : ''}`)
    if (intel.pattern && intel.pattern !== 'solid') factSheetParts.push(`• Pattern: ${intel.pattern}`)
    if (intel.material && intel.material !== 'other') factSheetParts.push(`• Material: ${intel.material}`)
    if (intel.neckline && intel.neckline !== 'other') factSheetParts.push(`• Neckline: ${intel.neckline}`)
    if (intel.sleeves) factSheetParts.push(`• Sleeves: ${intel.sleeves}`)
    if (intel.fit) factSheetParts.push(`• Fit: ${intel.fit}`)
    if (intel.length) factSheetParts.push(`• Length: ${intel.length}`)
    if (intel.keyFeatures?.length) factSheetParts.push(`• Key features: ${intel.keyFeatures.slice(0, 4).join(', ')}`)
    if (intel.description) factSheetParts.push(`• Description: ${intel.description}`)
  }

  // Coverage-aware swap directive — same logic as the FLUX path.
  // Tells Gemini exactly which body region to replace and which to keep.
  // Anti-hallucination language is INTENTIONALLY redundant — Gemini's image
  // priors are very strong, so the same constraint stated 3-4 different
  // ways significantly reduces failure rate.
  let coverageDirective = ''
  let regionLock = ''
  if (intel) {
    const garmentType = (intel.garmentType || '').toLowerCase()
    const isFullSet =
      intel.coverage === 'full_body' ||
      ['co_ord_set', 'full_outfit', 'jumpsuit', 'suit', 'saree', 'lehenga'].includes(garmentType)

    if (isFullSet) {
      const topDesc = intel.visibleTopInPhoto && intel.visibleTopInPhoto !== 'none' ? intel.visibleTopInPhoto : null
      const bottomDesc = intel.visibleBottomInPhoto && intel.visibleBottomInPhoto !== 'none' ? intel.visibleBottomInPhoto : null
      if (topDesc && bottomDesc) {
        coverageDirective = `\nCOVERAGE = FULL OUTFIT (top + bottom set). TOP = ${topDesc}. BOTTOM = ${bottomDesc}. Both pieces in Image 2 are worn together as a coordinated set.`
      } else {
        coverageDirective = `\nCOVERAGE = FULL BODY GARMENT (dress / jumpsuit / saree / lehenga). The single full-body garment from Image 2 covers from shoulders to feet.`
      }
      regionLock = `REGION LOCK: the swap affects the entire body from shoulders down. Show full body if visible in Image 1.`
    } else if (intel.coverage === 'lower_only' || /pants|jeans|skirt|trouser|short/.test(garmentType)) {
      const topToKeep = intel.visibleTopInPhoto && intel.visibleTopInPhoto !== 'none'
        ? ` (Image 2 may show a ${intel.visibleTopInPhoto} as styling — IGNORE that top entirely, the person's own top from Image 1 stays unchanged)` : ''
      coverageDirective = `\nCOVERAGE = LOWER GARMENT ONLY (pants / jeans / skirt). The garment from Image 2 is BOTTOM WEAR — it covers from waist to ankle, NOT the torso.${topToKeep}`
      regionLock =
        `REGION LOCK (ABSOLUTE):\n` +
        `  ✓ CHANGE: only the area from waist to ankles. Replace existing pants/skirt with the lower garment from Image 2.\n` +
        `  ✗ DO NOT TOUCH: everything from the waist up — the existing top, shirt, blouse, jacket, neckline, sleeves, shoulders, neck, face, hair, accessories. They stay PIXEL-IDENTICAL to Image 1.\n` +
        `  ✗ DO NOT extend the new lower garment upward into a dress or jumpsuit.\n` +
        `  ✗ DO NOT remove or recolor the existing top.\n` +
        `Show the lower body — do not crop above the knee.`
    } else {
      const bottomToKeep = intel.visibleBottomInPhoto && intel.visibleBottomInPhoto !== 'none'
        ? ` (Image 2 may show ${intel.visibleBottomInPhoto} as styling — IGNORE that bottom entirely, the person's own bottom from Image 1 stays unchanged)` : ''
      coverageDirective = `\nCOVERAGE = UPPER GARMENT ONLY (top / shirt / blouse / jacket / kurta). The garment from Image 2 is TOP WEAR — it covers from shoulders to waist/hip, NOT the legs.${bottomToKeep}`
      regionLock =
        `REGION LOCK (ABSOLUTE):\n` +
        `  ✓ CHANGE: only the area from shoulders to waist/hip. Replace existing top with the upper garment from Image 2.\n` +
        `  ✗ DO NOT TOUCH: everything from the waist down — the existing pants, jeans, skirt, shorts, legs, feet, shoes. They stay PIXEL-IDENTICAL to Image 1. If Image 1 shows green pants, the output shows the exact same green pants. If Image 1 shows blue jeans, the output shows the exact same blue jeans.\n` +
        `  ✗ DO NOT extend the new top downward into a dress, gown, kurta, or long flowing garment. The new top ENDS at the waist/hip, just like in Image 2.\n` +
        `  ✗ DO NOT remove, recolor, or replace the existing bottom wear.\n` +
        `  ✗ DO NOT bare the legs. If pants/skirt were visible in Image 1, they MUST still be visible in the output.\n` +
        `  ✗ DO NOT turn the outfit into a one-piece or full-body garment.\n` +
        `Preserve full body framing if visible in Image 1 — do not crop tighter than the input.`
    }
  }

  const factSheet = factSheetParts.length > 0
    ? `\n\nGARMENT FACT SHEET (use these EXACT specs — Image 2 may have lighting/angle distortion):\n${factSheetParts.join('\n')}`
    : ''

  const regionLockBlock = regionLock ? `\n\n${regionLock}` : ''

  const config: GenerateContentConfig = {
    responseModalities: ['TEXT', 'IMAGE'],
    systemInstruction: `You are a photorealistic virtual try-on editor. Output ONLY an edited image — no text.

TASK: Edit the clothing on the person from Image 1 so the final visible garment matches Image 2 exactly. This is a SURGICAL clothing change — only the specified body region changes, everything else stays IDENTICAL.

IDENTITY (NON-NEGOTIABLE):
- The output MUST show the EXACT SAME PERSON from Image 1
- Copy their face pixel-for-pixel — preserve every facial feature, skin tone, hair, and body proportion
- If Image 3 is a face close-up, use it as the DEFINITIVE identity anchor — output face must match Image 3 exactly
- Do NOT generate a different person or alter any facial features

GARMENT REPLACEMENT (STRIP-AND-REPLACE):
- FIRST: Mentally STRIP all existing clothing from the affected body area ONLY (defined by COVERAGE below)
- THEN: Apply ONLY the garment from Image 2 onto the bare area
- The output must show ONLY the garment from Image 2 in the swap region — NO traces of the original clothing there
- Do NOT blend, layer, or mix original clothing with the new garment
- PIXEL-PERFECT match: same color, pattern, texture, collar, sleeves, hem, fit, silhouette, and fabric as Image 2
- If Image 2 shows a model, IGNORE their face/body — copy ONLY the garment${coverageDirective}${regionLockBlock}

TEXTURE & COLOR FIDELITY:
- Reproduce the exact fabric texture from Image 2 — weave, sheen, drape, surface finish
- Match colors exactly using the hex codes in the FACT SHEET below when present
- For patterns: maintain motif scale, repeat density, and orientation as shown in Image 2
- Do NOT smooth, simplify, or stylize the texture — keep all visible fabric detail

FORBIDDEN HALLUCINATIONS (the most common failure modes — avoid them):
- Do NOT extend a TOP into a long dress, gown, kurta, saree, or full-body garment
- Do NOT extend a BOTTOM upward into a jumpsuit or dress
- Do NOT remove the bottom wear when swapping a top — the legs/pants MUST stay
- Do NOT remove the top when swapping a bottom — the shirt/torso MUST stay
- Do NOT invent extra layers (cardigans, jackets, vests, scarves) not present in Image 2
- Do NOT keep sleeves, collars, or hems from the original clothing in Image 1
- Do NOT create hybrid garments mixing features from Image 1 and Image 2
- Do NOT change garment color, pattern, or material from what's specified
- Do NOT change the background, pose, framing, or zoom level — only the clothing in the swap region changes

REALISM: Photorealistic output. Natural skin, realistic fabric drape. No AI smoothing or CGI look.${factSheet}`,
    imageConfig: {
      aspectRatio,
      personGeneration: 'allow_adult',
      imageSize: resolution,
    } as ImageConfig,
    temperature: 0.1,
    topP: 0.8,
    topK: 12,
  }

  // Model fallback chain: Pro → Flash on 503/UNAVAILABLE
  // gemini-3-pro-image-preview is a preview model prone to capacity spikes.
  // Automatically fall back to gemini-3.1-flash-image-preview (Nano Banana 2) on 503.
  const FALLBACK_MODEL = 'gemini-3.1-flash-image-preview'
  const modelsToTry = requestedModel !== FALLBACK_MODEL
    ? [requestedModel, FALLBACK_MODEL]
    : [requestedModel]

  for (let mi = 0; mi < modelsToTry.length; mi++) {
    const modelAttempt = modelsToTry[mi]
    const isFinalModel = mi === modelsToTry.length - 1

    try {
      const startTime = Date.now()
      const response = await geminiGenerateContent({
        model: modelAttempt,
        contents,
        config,
      })

      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      if (modelAttempt !== requestedModel) {
        console.warn(`\u26a1 Used fallback model ${modelAttempt} (${duration}s) \u2014 primary ${requestedModel} was unavailable`)
      } else if (isDev) {
        console.log(`\ud83c\udf4c DIRECT TRANSPORT: ${modelAttempt} responded in ${duration}s`)
      }

      if (response.data) {
        return `data:image/png;base64,${response.data}`
      }

      if (response.candidates && response.candidates.length > 0) {
        const candidate = response.candidates[0]
        const finishReason = (candidate as any).finishReason
        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
          throw new Error(`Generation blocked by safety filter (${finishReason})`)
        }
        if (candidate.content && candidate.content.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
              return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            }
          }
        }
      }

      if (!isFinalModel) {
        console.warn(`\u26a0\ufe0f ${modelAttempt} returned empty response, trying fallback...`)
        continue
      }
      throw new Error('No image generated by Gemini')

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const msgLower = msg.toLowerCase()

      // Treat 503 (capacity) and 504 (deadline exceeded) as switchable errors.
      // Both mean the Pro model is overloaded \u2014 flash is the right fallback.
      const isCapacityError =
        msg.includes('503') ||
        msg.includes('504') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('overloaded') ||
        msgLower.includes('deadline exceeded') ||
        msgLower.includes('deadline_exceeded') ||
        msgLower.includes('deadline expired')

      if (isCapacityError && !isFinalModel) {
        const errCode = msg.includes('504') || msgLower.includes('deadline') ? '504' : '503'
        console.warn(`\u26a0\ufe0f ${modelAttempt} ${errCode} \u2014 switching to fallback ${modelsToTry[mi + 1]}`)
        continue
      }
      throw err
    }
  }

  throw new Error('No image generated by Gemini')
}


// ═══════════════════════════════════════════════════════════════════════
// GPT IMAGE 1.5 TRANSPORT (for Try-On Pipeline)
// ═══════════════════════════════════════════════════════════════════════

function resolveGPTImageSize(aspectRatio?: string): '1024x1024' | '1024x1536' | '1536x1024' {
  // GPT Responses API only supports: 1024x1024, 1024x1536, 1536x1024, auto
  if (aspectRatio === '9:16' || aspectRatio === '4:5' || aspectRatio === '3:4') return '1024x1536'
  if (aspectRatio === '16:9') return '1536x1024'
  return '1024x1024'
}

/**
 * GPT Image 1.5 transport layer for the Try-On pipeline.
 *
 * Uses OpenAI Images API (client.images.edit) with gpt-image-1.5 model.
 * - input_fidelity: 'high' preserves face features from input images
 * - gpt-image-1.5 preserves first 5 input images with high fidelity
 * - Person image is FIRST for maximum identity preservation
 *
 * Content order: [person_image, face_crop(optional), garment_image]
 */
export async function generateTryOnGPT(options: DirectTryOnOptions): Promise<string> {
  const {
    personImageBase64,
    garmentImageBase64,
    faceCropBase64,
    prompt,
    aspectRatio = '1:1',
  } = options

  const isDev = process.env.VERCEL_ENV ? process.env.VERCEL_ENV !== 'production' : process.env.NODE_ENV !== 'production'

  // Clean base64 (strip data URI prefix if present)
  const cleanPerson = personImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')
  const cleanGarment = garmentImageBase64.replace(/^data:image\/[a-z]+;base64,/, '')

  if (!cleanPerson || cleanPerson.length < 100) {
    throw new Error('Invalid person image')
  }
  if (!cleanGarment || cleanGarment.length < 100) {
    throw new Error('Invalid garment image')
  }

  if (isDev) console.log(`🎯 GPT IMAGE 1.5 (Images API): prompt ${prompt.length} chars, size ${resolveGPTImageSize(aspectRatio)}`)

  const { getOpenAIKey } = await import('@/lib/config/api-keys')
  const OpenAI = (await import('openai')).default
  const { toFile } = await import('openai')
  const client = new OpenAI({ apiKey: getOpenAIKey() })

  // Build image array — person FIRST for highest fidelity (gpt-image-1.5 preserves first 5)
  const images: any[] = []

  // 1. Person image (highest fidelity — face identity anchor)
  images.push(
    await toFile(Buffer.from(cleanPerson, 'base64'), 'person.png', { type: 'image/png' })
  )

  // 2. Face crop (identity reinforcement — close-up gets high fidelity)
  if (faceCropBase64 && faceCropBase64.length > 100) {
    const cleanFaceCrop = faceCropBase64.replace(/^data:image\/[a-z]+;base64,/, '')
    if (cleanFaceCrop.length > 100) {
      images.push(
        await toFile(Buffer.from(cleanFaceCrop, 'base64'), 'face_crop.png', { type: 'image/png' })
      )
      if (isDev) console.log('👤 Added face crop for identity reinforcement')
    }
  }

  // 3. Garment image
  images.push(
    await toFile(Buffer.from(cleanGarment, 'base64'), 'garment.png', { type: 'image/png' })
  )

  const startTime = Date.now()

  const response = await client.images.edit({
    model: 'gpt-image-1.5',
    image: images,
    prompt,
    size: resolveGPTImageSize(aspectRatio),
    quality: 'high' as any,
    input_fidelity: 'high' as any,
  } as any)

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  if (isDev) console.log(`🎯 GPT Image 1.5: responded in ${duration}s`)

  const imageBase64 = response.data?.[0]?.b64_json
  if (!imageBase64) {
    throw new Error('GPT Image 1.5 returned no image data')
  }

  return `data:image/png;base64,${imageBase64}`
}

/**
 * Generate try-on with multi-turn conversation support (for iterative refinement)
 */
export async function generateTryOnWithChat(
  options: TryOnOptions,
  chatHistory?: Array<{ role: 'user' | 'model'; content: any }>
): Promise<{ image: string; chat: any }> {
  const {
    personImage,
    clothingImage,
    prompt,
    model = 'gemini-3-pro-image-preview',
    aspectRatio = '4:5',
    resolution = '2K',
  } = options

  try {
    const client = getClient()
    const contents: ContentListUnion = [prompt]

    if (personImage) {
      const cleanPersonImage = personImage.replace(/^data:image\/[a-z]+;base64,/, '')
      contents.push({
        inlineData: {
          data: cleanPersonImage,
          mimeType: 'image/jpeg',
        },
      } as any)
    }

    if (clothingImage) {
      const cleanClothingImage = clothingImage.replace(/^data:image\/[a-z]+;base64,/, '')
      contents.push({
        inlineData: {
          data: cleanClothingImage,
          mimeType: 'image/jpeg',
        },
      } as any)
    }

    const imageConfig: ImageConfig = {
      aspectRatio: aspectRatio as any,
    }

    if (model === 'gemini-3-pro-image-preview' && resolution) {
      imageConfig.imageSize = resolution as any
    }

    const chat = await client.chats.create({
      model,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig,
      },
    })

    const response = await chat.sendMessage({ message: contents as any })

    let generatedImage: string | null = null

    if (response.data) {
      generatedImage = `data:image/png;base64,${response.data}`
    } else if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
            generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
            break
          }
        }
      }
    }

    if (!generatedImage) {
      throw new Error('No image found in response')
    }

    return { image: generatedImage, chat }
  } catch (error) {
    console.error('Gemini chat generation error:', error)
    throw error instanceof Error ? error : new Error('Failed to generate image with chat')
  }
}
