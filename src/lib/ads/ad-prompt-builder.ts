/**
 * AD PROMPT BUILDER — GPT-4o Vision + Intelligent Prompt Crafting
 *
 * GPT-4o SEES the product image directly (vision) and crafts a
 * production-quality composition prompt. No separate clothing analysis
 * needed — the model recognizes shoes, bags, shirts, accessories, etc.
 *
 * Text overlay is treated as COMPOSITIONAL TYPOGRAPHY integrated into
 * the design — not a plain text stamp.
 *
 * KEY: Uses the style reference examples from ad-style-examples.ts so
 * GPT-4o can study *real* high-quality prompts before writing its own.
 */
import 'server-only'
import { getOpenAI } from '@/lib/openai'
import {
  type AdGenerationInput,
  type AdPreset,
  type AdPresetId,
  getAdPreset,
  buildFallbackPrompt,
} from './ad-styles'
import { AD_STYLE_EXAMPLES, type AdStyleExample } from './ad-style-examples'

const PROMPT_MODEL = process.env.AD_PROMPT_MODEL?.trim() || 'gpt-4o'

// ═══════════════════════════════════════════════════════════════
// PRESET → STYLE EXAMPLE MAPPING
// Each preset maps to the most relevant training examples so
// GPT-4o can study them before writing the final prompt.
// ═══════════════════════════════════════════════════════════════

const PRESET_EXAMPLE_MAP: Record<string, string[]> = {
  // UGC presets → UGC + lifestyle examples
  UGC_CANDID: ['editorial-escalator-fit-check', 'digicam-neon-crosswalk', 'japandi-overpass-candid', 'street-high-angle-crosswalk', 'y2k-fisheye-bomber-street', 'italian-cafe-candid', 'tokyo-street-matcha-jersey', 'mediterranean-swim-editorial', 'creative-martin-parr-domestic'],
  UGC_STORY: ['ugc-phone-sky', 'golden-hour-glamour-cafe', 'italian-cafe-candid'],
  UGC_REEL: ['y2k-duo-white-studio-dynamic', 'y2k-red-studio-helmet', 'cinematic-motion-runners', 'creative-raw-analog-tennis', 'creative-follow-cam-snowboard'],
  UGC_TESTIMONIAL: ['angle-high-soft-flattering', 'golden-hour-glamour-cafe', 'italian-cafe-candid', 'creative-beauty-close-up-cream'],
  UGC_FLAT_LAY: ['editorial-escalator-fit-check', 'angle-down-hero-product', 'standalone-clean-4k', 'food-office-product-in-hand', 'lifestyle-blank-tee-mockup'],
  UGC_GRWM: ['y2k-mirror-lip-gloss', 'italian-cafe-candid', 'golden-hour-glamour-cafe', 'creative-cyclorama-juice-portrait'],
  // Editorial presets
  EDITORIAL_PREMIUM: ['editorial-escalator-fit-check', 'editorial-amber-hoodie-headphones', 'editorial-tennis-court-spotlight', 'editorial-70s-staircase-jumpsuit', 'japandi-overpass-candid', 'editorial-kerala-bed', 'barbershop-kodachrome-trench', 'meadow-white-dress-contemplative', 'creative-surreal-horse-shadow', 'editorial-glow-blur-portrait'],
  EDITORIAL_FASHION: ['editorial-escalator-fit-check', 'editorial-tennis-court-spotlight', 'y2k-duo-white-studio-dynamic', 'editorial-bw-low-angle-latex', 'editorial-70s-staircase-jumpsuit', 'angle-side-profile-editorial', 'creative-bold-color-studio', 'creative-reeded-glass-portrait', 'creative-raw-analog-tennis'],
  EDITORIAL_BEAUTY: ['editorial-amber-hoodie-headphones', 'beauty-ice-block-lipbalm', 'creative-beauty-close-up-cream', 'y2k-mirror-lip-gloss', 'editorial-glow-blur-portrait', 'creative-product-hands-motion-blur'],
  EDITORIAL_STREET: ['digicam-neon-crosswalk', 'y2k-fisheye-bomber-street', 'y2k-red-studio-helmet', 'street-high-angle-crosswalk', 'tokyo-street-matcha-jersey', 'y2k-varsity-studio', 'cinematic-motion-runners', 'creative-raw-analog-tennis'],
  EDITORIAL_FILM_NOIR: ['editorial-tennis-court-spotlight', 'barbershop-kodachrome-trench', 'creative-surreal-horse-shadow', 'sports-monochrome-typography', 'deconstructed-face-collage'],
  EDITORIAL_ETHEREAL: ['beach-sunset-satin-twirl', 'meadow-white-dress-contemplative', 'editorial-glow-blur-portrait', 'creative-beauty-close-up-cream', 'italian-cafe-candid'],
  // Commercial presets
  PRODUCT_LIFESTYLE: ['editorial-escalator-fit-check', 'japandi-overpass-candid', 'angle-high-soft-flattering', 'lifestyle-blank-tee-mockup', 'food-office-product-in-hand', 'ugc-phone-sky'],
  STUDIO_POSTER: ['studio-chrome-floral', 'sports-monochrome-typography', 'creative-bw-neon-cta'],
  PRODUCT_HERO: ['beauty-ice-block-lipbalm', 'product-hero-beauty-lipstick', 'standalone-surreal-installation', 'text-based-air-jordan-explosion'],
  COMMERCIAL_CAROUSEL: ['standalone-clean-4k', 'lifestyle-blank-tee-mockup', 'standalone-high-fashion-path'],
  COMMERCIAL_FLAT_POSTER: ['studio-chrome-floral', 'creative-bold-color-studio', 'text-based-dynamic-magenta'],
  // Creative presets
  CREATIVE_SURREAL: ['editorial-tennis-court-spotlight', 'surreal-red-dress-cubes', 'beauty-ice-block-lipbalm', 'surreal-magritte-picnic', 'standalone-surreal-installation', 'creative-surreal-horse-shadow'],
  CREATIVE_CINEMATIC: ['tunnel-360-pastel-tracksuit', 'cinematic-motion-runners', 'cinematic-low-angle-flying', 'barbershop-kodachrome-trench', 'creative-follow-cam-snowboard'],
  CREATIVE_TEXT_DYNAMIC: ['text-based-dynamic-magenta', 'text-based-dynamic-green', 'text-based-dynamic-blue-white', 'text-based-air-jordan-explosion'],
  CREATIVE_BOLD_COLOR: ['creative-bold-color-studio', 'creative-reeded-glass-portrait', 'text-based-pop-art'],
  CREATIVE_NEON_GRADIENT: ['text-based-dynamic-magenta', 'text-based-dynamic-green', 'text-based-dynamic-blue-white'],
  CREATIVE_RETRO_FILM: ['editorial-amber-hoodie-headphones', 'digicam-neon-crosswalk', 'editorial-70s-staircase-jumpsuit', 'barbershop-kodachrome-trench', 'tokyo-street-matcha-jersey', 'cinematic-motion-runners', 'creative-raw-analog-tennis', 'creative-martin-parr-domestic'],
  CREATIVE_3D_RENDER: ['product-hero-beauty-lipstick', 'standalone-surreal-installation', 'studio-chrome-floral'],
  CREATIVE_VAPORWAVE: ['digicam-neon-crosswalk', 'y2k-red-studio-helmet', 'y2k-fisheye-bomber-street', 'y2k-varsity-studio', 'text-based-dynamic-magenta', 'text-based-pop-art'],
  CREATIVE_DOUBLE_EXPOSURE: ['creative-surreal-horse-shadow', 'editorial-glow-blur-portrait', 'deconstructed-face-collage'],
  CREATIVE_GLASSMORPHISM: ['standalone-surreal-installation', 'product-hero-beauty-lipstick', 'creative-reeded-glass-portrait'],
  CREATIVE_WES_ANDERSON: ['italian-cafe-candid', 'creative-martin-parr-domestic', 'creative-cyclorama-juice-portrait'],
  CREATIVE_DECONSTRUCTED: ['surreal-red-dress-cubes', 'deconstructed-face-collage', 'text-based-air-jordan-explosion', 'standalone-surreal-installation'],
  // Standalone product
  STANDALONE_CLEAN: ['standalone-clean-4k', 'standalone-high-fashion-path'],
  STANDALONE_SURREAL: ['standalone-surreal-installation', 'standalone-high-fashion-path', 'product-hero-beauty-lipstick'],
  STANDALONE_LUXURY_MACRO: ['beauty-ice-block-lipbalm', 'studio-chrome-floral', 'product-hero-beauty-lipstick', 'creative-product-hands-motion-blur'],
  STANDALONE_LEVITATION: ['text-based-air-jordan-explosion', 'product-hero-beauty-lipstick', 'standalone-surreal-installation'],
  // Performance / Conversion
  PERF_MINIMAL_CLEAN: ['standalone-clean-4k', 'standalone-high-fashion-path'],
  PERF_SPLIT_COMPARE: ['creative-bold-color-studio', 'lifestyle-blank-tee-mockup'],
  PERF_OOH_BILLBOARD: ['placement-subway-billboard', 'ooh-billboard-dual-panel'],
  PERF_SOCIAL_PROOF: ['beach-sunset-satin-twirl', 'italian-cafe-candid', 'golden-hour-glamour-cafe', 'mediterranean-swim-editorial'],
  // Sports / Athletic
  SPORTS_DYNAMIC: ['y2k-duo-white-studio-dynamic', 'tunnel-360-pastel-tracksuit', 'editorial-bw-low-angle-latex', 'angle-low-hero-dramatic', 'cinematic-motion-runners', 'creative-follow-cam-snowboard', 'creative-fashion-kick-identity'],
  SPORTS_MONOCHROME: ['sports-monochrome-typography', 'text-based-air-jordan-explosion'],
  SPORTS_TUNNEL_HERO: ['cinematic-motion-runners', 'cinematic-low-angle-flying', 'sports-monochrome-typography'],
  // Indian fashion
  INDIAN_FESTIVE: ['vertical-lehenga-celebrate', 'vertical-sharara-twirl'],
  INDIAN_ETHNIC: ['vertical-lehenga-celebrate', 'vertical-sharara-twirl', 'editorial-kerala-bed'],
  INDIAN_STREET_FUSION: ['y2k-fisheye-bomber-street', 'y2k-varsity-studio', 'cinematic-motion-runners', 'creative-raw-analog-tennis'],
}

/** Presets that default to "no model" but should respect user's explicit character choice */
const PRODUCT_ONLY_PRESETS: Set<string> = new Set([
  'PRODUCT_HERO',
  'STANDALONE_CLEAN',
  'STANDALONE_SURREAL',
  'STANDALONE_LUXURY_MACRO',
  'STANDALONE_LEVITATION',
  'CREATIVE_3D_RENDER',
  'CREATIVE_DECONSTRUCTED',
  'CREATIVE_GLASSMORPHISM',
  'PERF_MINIMAL_CLEAN',
  'COMMERCIAL_CAROUSEL',
  'UGC_FLAT_LAY',
])

function getStyleExamplesForPreset(presetId: AdPresetId, hasCharacter: boolean): AdStyleExample[] {
  let ids = PRESET_EXAMPLE_MAP[presetId] || []

  // If user explicitly chose a character on a product-only preset, swap in
  // character-inclusive references so GPT-4o generates with a model
  if (hasCharacter && PRODUCT_ONLY_PRESETS.has(presetId)) {
    ids = ['text-based-dynamic-magenta', 'creative-bold-color-studio', 'creative-fashion-kick-identity']
  }

  return ids
    .map((id) => AD_STYLE_EXAMPLES.find((e) => e.id === id))
    .filter(Boolean) as AdStyleExample[]
}

export interface ProductAnalysis {
  garmentType?: string
  fabric?: string
  pattern?: string
  color?: string
  fitStyle?: string
  [key: string]: unknown
}

export interface AdPromptResult {
  prompt: string
  model: string
  fallback: boolean
}

/**
 * Build a production-quality image generation prompt using GPT-4o vision.
 * GPT-4o sees the product image AND studies real reference prompts.
 */
export async function buildAdPrompt(
  input: AdGenerationInput,
  productImageBase64?: string | null,
  faceAnchor?: string | null
): Promise<AdPromptResult> {
  const preset = getAdPreset(input.preset)
  if (!preset) {
    throw new Error(`Unknown preset: ${input.preset}`)
  }

  try {
    const prompt = await buildPromptWithGPT(preset, input, productImageBase64, faceAnchor)
    return { prompt, model: PROMPT_MODEL, fallback: false }
  } catch (err) {
    console.warn('[AdPromptBuilder] GPT prompt build failed, using fallback:', err)
    const prompt = buildFallbackPrompt(input)
    return { prompt, model: 'fallback', fallback: true }
  }
}

// ═══════════════════════════════════════════════════════════════
// GPT-4o VISION PROMPT BUILDER
// ═══════════════════════════════════════════════════════════════

function toDataUrl(base64: string): string {
  if (base64.startsWith('data:image/')) return base64
  return `data:image/jpeg;base64,${base64}`
}

async function buildPromptWithGPT(
  preset: AdPreset,
  input: AdGenerationInput,
  productImageBase64?: string | null,
  faceAnchor?: string | null
): Promise<string> {
  const openai = getOpenAI()

  const hasText = !!(input.textOverlay && (input.textOverlay.headline || input.textOverlay.subline || input.textOverlay.tagline))
  const systemMessage = buildSystemMessage(hasText)
  const userContent = buildUserContent(preset, input, productImageBase64, faceAnchor)

  const response = await openai.chat.completions.create({
    model: PROMPT_MODEL,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userContent },
    ],
    temperature: 0.5,
    max_tokens: 1500,
  })

  const text = response.choices[0]?.message?.content?.trim()
  if (!text || text.length < 50) {
    throw new Error('GPT returned empty or too-short prompt')
  }

  console.log(`[AdPromptBuilder] GPT-4o prompt built (${text.length} chars)`)
  return text
}

function buildSystemMessage(hasText: boolean): string {
  return `You are an elite advertising art director who writes image generation prompts for Gemini Nano Banana Pro (gemini-3-pro-image-preview).

You receive: a product image, a creative brief, and REFERENCE PROMPTS from real campaigns. Study the references — absorb their density and quality. Your output must match or exceed them.

YOUR JOB: Write ONE narrative-style prompt (NOT keyword stuffing) that generates a STUNNING, campaign-grade ad image.

═══ CRAZY GOOD QUALITY (NON-NEGOTIABLE) ═══
Every image must feel like a Vogue/GQ/Nike campaign shot: 8K resolution, tack-sharp focus on subject and product, professional lighting rig (key/fill/rim), realistic skin and fabric texture (visible pores, weave, reflections). No AI mush, no plastic skin, no flat lighting. Specify lens (e.g. 85mm f/1.4), f-stop, and lighting setup in your prompt when it helps. Anatomy correct, hands natural, proportions human.

═══ CAMERA ANGLES ═══
Use precise camera angle vocabulary so the image has impact:
- DOWN ANGLE: camera above, looking down at subject/product (flat lay, overhead, top-down).
- HIGH ANGLE: slightly above eye level, looking down — flattering for product and face.
- LOW ANGLE: camera low or at ground level, looking up — heroic, powerful, dramatic.
- SIDE: profile or near-profile view — strong silhouette, editorial.
- THREE-QUARTER: classic 45° to subject — versatile, flattering.
- EYE LEVEL: camera at subject's eye height — natural, direct.
- DUTCH: tilted horizon — tension, energy, fashion.

When the brief specifies a camera angle, use it explicitly in your prompt (e.g. "Shot from a low angle, camera near ground level looking up at the model..."). When "Auto", choose the most impactful angle for the preset and product.

═══ GEMINI 3 PRO OPTIMIZATION ═══

Gemini 3 Pro responds best to NARRATIVE DESCRIPTIONS, not comma-separated tags. Structure your prompt as a flowing visual paragraph using this framework:
[WHAT is in the scene] + [what they're DOING] + [WHERE / environment] + [HOW it LOOKS / mood] + [TECHNICAL specifications]

Example of GOOD narrative structure:
"A confident young man in a charcoal tracksuit sprints through a rain-soaked Tokyo side street at dusk, one arm extended back mid-stride, his red Nike Air Max 97 sneakers catching light from overhead neon signs. The wet asphalt reflects electric blue and magenta from storefronts, creating mirror-like light pools beneath his feet..."

Example of BAD keyword structure:
"man, running, Nike shoes, rain, Tokyo, neon, night, dynamic, 8K"

═══ ABSOLUTE RULES ═══

1. OUTPUT ONLY THE PROMPT. No explanations, no JSON, no markdown.

2. PRODUCT ACCURACY (NON-NEGOTIABLE).
   LOOK AT the product image. Describe EXACTLY: brand, colourway (#hex if possible), material (mesh/leather/suede/canvas/satin), shape, distinctive features (logo placement, sole colour, stitching pattern, hardware). Be forensically specific.

3. NARRATIVE DENSITY: 300–700 words of flowing visual description.
   Include: lighting rig (key at 45°, fill ratio, rim angle), camera (24/35/50/85mm, f/stop, shutter speed if motion), colour palette (use hex codes: "deep crimson #8B0000", "electric cyan #00E5FF"), texture (8K, film grain weight, dewy/matte), composition (rule of thirds, leading lines, negative space percentage).
   Name photographers when relevant: Guy Bourdin, Tim Walker, Annie Leibovitz, Martin Parr, Peter Lindbergh.

${hasText ? `4. TYPOGRAPHY = COMPOSITIONAL BLEND (text has been requested by the user).
   Text is DESIGNED INTO the scene — not added on top. Use 2+ blending techniques:
   a) DEPTH LAYERING: letters BEHIND subject (subject's body occludes parts of text)
   b) 3D EXTRUSION: letters have physical thickness, catch scene lighting, cast shadows
   c) ENVIRONMENT MASKING: text wraps surfaces, reflects in wet ground, printed on walls
   d) COLOUR BLEED: text gradient matches scene palette, glows onto nearby surfaces
   e) PARTIAL OCCLUSION: product/hand/hair overlaps parts of text
   f) MATERIAL TEXTURE: chrome, neon tube, embossed leather, frosted glass

   NEVER say "add text" or "text overlay". Instead describe physical presence: "massive ultra-bold white sans-serif letters 'JUST DO IT' — the D and O appear BEHIND the athlete's shoulder, letters have 3mm depth with soft shadow, same dramatic rim lighting as the subject, text occupies 30% of frame width."` : `4. NO TEXT / NO TYPOGRAPHY (CRITICAL — NON-NEGOTIABLE).
   The user has NOT requested any text. Do NOT include ANY text, words, letters, numbers, brand names, slogans, watermarks, or typography of ANY kind in the image. The image must be PURELY VISUAL — a photograph with ZERO written content. If you include ANY text, you have FAILED this assignment.
   Do NOT write text on walls, signs, clothing, or any surface. No logos, no brand marks, no captions.`}

5. CHARACTER IS MANDATORY when specified. If brief says "CHARACTER (USER SELECTED — MUST INCLUDE)", the character MUST be prominent, interacting with the product, shown at minimum three-quarter body. User's character choice OVERRIDES preset defaults.

6. END with one AVOID line. Example: "AVOID: blurry, watermark, extra limbs, distorted anatomy, clipart, text errors, multiple products, low resolution, AI artifacts, malformed hands."

7. MATCH REFERENCE QUALITY. Your prompt must be as detailed, specific, and visually rich as the reference prompts provided.`
}

function buildUserContent(
  preset: AdPreset,
  input: AdGenerationInput,
  productImageBase64?: string | null,
  faceAnchor?: string | null
): any[] {
  const content: any[] = []

  // Pass the product image directly to GPT-4o vision
  if (productImageBase64) {
    content.push({
      type: 'image_url',
      image_url: {
        url: toDataUrl(productImageBase64),
        detail: 'high',
      },
    })
  }

  // Build the text brief
  const sections: string[] = []

  // Determine if user explicitly selected a character
  const ct = input.characterType || 'none'
  const hasCharacter = ct !== 'none'
  const isProductOnlyPreset = PRODUCT_ONLY_PRESETS.has(input.preset)
  // User overrides the preset's "no model" constraint
  const characterOverridesPreset = hasCharacter && isProductOnlyPreset

  // ═══ 1. REFERENCE PROMPTS (the training data) ═══
  // These are REAL prompts that produced stunning images. GPT-4o studies them.
  const examples = getStyleExamplesForPreset(input.preset, hasCharacter)
  if (examples.length > 0) {
    const exampleBlocks = examples
      .slice(0, 3) // max 3 references to keep token budget
      .map(
        (ex, i) =>
          `REFERENCE ${i + 1}: "${ex.name}"\nPROMPT: ${ex.prompt}\nSTYLE NOTES: ${ex.styleNotes}`
      )
      .join('\n\n')

    sections.push(`═══ STUDY THESE REFERENCE PROMPTS ═══
These generated stunning, production-quality images. Match this density, specificity, and quality level in your output.

${exampleBlocks}

═══ END REFERENCES ═══`)
  }

  // ═══ 2. Creative brief ═══
  // If user selected a character on a "product only" preset, override the
  // scene guide to include the character instead of "no model"
  let sceneGuide = preset.sceneGuide
  let avoidTerms = [...preset.avoid]

  if (characterOverridesPreset) {
    // Replace "no model" scene with a character-inclusive version
    sceneGuide = sceneGuide
      .replace(/No model[;,.]?\s*/gi, '')
      .replace(/product is the hero/gi, 'product is prominently featured')

    // Adapt the scene to include a character
    if (input.preset === 'PRODUCT_HERO') {
      sceneGuide = `Dynamic ad composition: ${ct === 'animal' ? 'a photorealistic animal' : 'a model'} interacts with the product against a dramatic gradient background with abstract shapes and premium lighting. Product is prominently featured and clearly visible. Premium, futuristic, campaign-quality.`
    } else if (input.preset === 'STANDALONE_CLEAN') {
      sceneGuide = `Clean studio setting with ${ct === 'animal' ? 'a photorealistic animal' : 'a model'} presenting the product. Neutral background, professional lighting, product clearly visible and prominent.`
    } else if (input.preset === 'STANDALONE_SURREAL') {
      sceneGuide = `Surreal dreamlike scene with ${ct === 'animal' ? 'a photorealistic animal' : 'a model'} and the product in an installation-art setting. Floating elements, gradient sky, warm tones, poster-worthy. Product clearly visible.`
    }

    // Remove "model/person" from the avoid list since user wants one
    avoidTerms = avoidTerms.filter(
      (t) => !t.toLowerCase().includes('model') && !t.toLowerCase().includes('person')
    )
  }

  // Camera angle: explicit instruction when user selected one
  const cameraAngle = input.cameraAngle || 'auto'
  const angleInstruction =
    cameraAngle === 'auto'
      ? 'Camera angle: Choose the most impactful angle (down, high, low, side, or three-quarter) for this preset and product. State it explicitly in your prompt (e.g. "Shot from a low angle...", "Overhead down-angle flat lay...").'
      : cameraAngle === 'down'
        ? 'Camera angle: DOWN ANGLE (mandatory). Camera above, looking down at subject or product. Describe it in the prompt: e.g. "Shot from directly above", "Overhead down-angle view", "Camera looking down at...".'
        : cameraAngle === 'high'
          ? 'Camera angle: HIGH ANGLE (mandatory). Slightly above eye level, looking down. Flattering for product and face. Use in prompt: "Shot from a high angle, camera slightly above..."'
          : cameraAngle === 'low'
            ? 'Camera angle: LOW ANGLE (mandatory). Camera low or at ground level, looking up. Heroic, dramatic. Use in prompt: "Low-angle shot, camera near ground level looking up at...", "Worm\'s-eye view..."'
            : cameraAngle === 'side'
              ? 'Camera angle: SIDE PROFILE (mandatory). Profile or near-profile view. Strong silhouette, editorial. Use in prompt: "Side profile view", "Shot from the side...".'
              : cameraAngle === 'three-quarter'
                ? 'Camera angle: THREE-QUARTER (mandatory). Classic 45° to subject. Use in prompt: "Three-quarter view", "Shot at 45 degrees to the subject...".'
                : cameraAngle === 'eye-level'
                  ? 'Camera angle: EYE LEVEL (mandatory). Camera at subject\'s eye height. Use in prompt: "Eye-level shot", "Camera at subject height...".'
                  : cameraAngle === 'dutch'
                    ? 'Camera angle: DUTCH / TILTED (mandatory). Tilted horizon for tension and energy. Use in prompt: "Dutch angle", "Tilted camera", "Canted horizon...".'
                    : 'Camera angle: Choose the most impactful angle and state it explicitly in your prompt.'

  sections.push(`CREATIVE BRIEF:
Preset: ${preset.name} (${preset.category})
Scene direction: ${sceneGuide}
Lighting direction: ${preset.lightingGuide}
Camera direction: ${preset.cameraGuide}
${angleInstruction}
Must avoid: ${avoidTerms.join(', ')}`)

  // ═══ 3. Product instruction ═══
  if (productImageBase64) {
    sections.push(`PRODUCT (attached image — LOOK AT IT):
Describe the EXACT product you see: type (shoe/shirt/bag/accessory), brand (logo, name), specific colourway, materials (mesh/leather/suede/canvas/satin), shape/silhouette, sole, hardware, stitching, distinctive features. Be forensically specific — "red Nike Air Max 97 with white swoosh, translucent air bubble sole, mesh upper with reflective panels" NOT "a pair of red sneakers". The product in the generated image MUST be a precise visual match.`)
  }

  // ═══ 4. Character (ALWAYS respected when user selects one) ═══
  if (hasCharacter) {
    if (ct === 'animal') {
      const animal = input.animalType || 'fox'
      const style = input.characterStyle || 'natural, photorealistic'
      sections.push(`CHARACTER (USER SELECTED — MUST INCLUDE):
A photorealistic CGI 3D rendered ${animal} wearing or interacting with the product. ${style} style. Soft diffused studio lighting, shallow depth of field, surreal + comedic high-fashion editorial look. Ultra-high detail with sharp fur/feather textures. Bold saturated colors, contemporary luxury brand aesthetic — premium yet playfully absurd.
The ${animal} MUST be prominent in the image — not a background element. It is the model of this ad.`)
    } else {
      const gender = ct === 'human_male' ? 'man' : 'woman'
      const age = input.characterAge || input.subject?.ageRange || '22-30'
      const style = input.characterStyle || 'natural, confident'
      const pose = input.subject?.pose || 'dynamic, editorial'
      const expression = input.subject?.expression || 'confident, direct gaze'
      sections.push(`CHARACTER (USER SELECTED — MUST INCLUDE):
A young ${gender} (age ${age}), ${style} style. ${pose} pose, ${expression}. Realistic skin with visible pores and texture, natural body proportions, anatomically correct. The ${gender} wears or holds the product. Describe a specific complementary outfit.
The ${gender} MUST be prominent in the image — not just hands or silhouette. Show at least three-quarter body. This is a model-driven ad.`)
    }
  }

  // ═══ 5. Face identity lock ═══
  if (faceAnchor && input.lockFaceIdentity) {
    sections.push(`FACE IDENTITY LOCK (CRITICAL — NON-NEGOTIABLE):
Preserve EXACT facial structure, bone geometry, skin tone, and features from the reference person image:
${faceAnchor}
Face is IMMUTABLE. Do NOT alter any facial feature. Include explicit instruction: "Preserve the exact face, jawline, eye shape, skin tone, and facial proportions of the reference person."`)
  }

  // ═══ 6. Text — COMPOSITIONAL BLEND TYPOGRAPHY or NO TEXT ═══
  const hasTextOverlay = input.textOverlay && (input.textOverlay.headline || input.textOverlay.subline || input.textOverlay.tagline)
  if (!hasTextOverlay) {
    // CRITICAL: Explicitly tell GPT-4o NOT to add any text
    sections.push(`TEXT: NONE. Do NOT include ANY text, words, letters, numbers, brand names, slogans, or typography in the image. The image must be purely visual — no written content whatsoever. This is a photography-only composition.`)
  }

  if (hasTextOverlay) {
    const to = input.textOverlay!
    const fontStyle = to.fontStyle || 'bold-display'
    const placement = to.placement || 'center'

    const fontDesc =
      fontStyle === 'serif'
        ? 'elegant high-contrast serif with sharp terminals (like Didot, Bodoni, or Vogue masthead)'
        : fontStyle === 'handwritten'
          ? 'expressive brush-lettered script with energy and personality (like Sign Painter or hand-painted signage)'
          : fontStyle === 'bold-display'
            ? 'ultra-bold condensed display sans-serif (like Druk Wide Bold, Futura Extra Bold, or Impact)'
            : 'clean geometric sans-serif with heavy weight (like Montserrat ExtraBold, Inter Black, or Helvetica Neue 95 Black)'

    // Build specific text entries with blending instructions
    const textEntries: string[] = []
    if (to.headline) {
      textEntries.push(`HEADLINE: "${to.headline}" — rendered in ${fontDesc}, MASSIVE scale (occupying 25-40% of frame width). The letters have 3D depth/extrusion with subtle shadow. Position: ${placement} of frame.`)
    }
    if (to.subline) {
      textEntries.push(`SUBLINE: "${to.subline}" — same font family but lighter weight, 40% the size of headline, positioned below headline.`)
    }
    if (to.tagline) {
      textEntries.push(`TAGLINE: "${to.tagline}" — small caps or italic variant, positioned near bottom edge of frame as anchor.`)
    }

    if (textEntries.length > 0) {
      // Pick blending techniques based on whether there's a character
      const blendTechniques = hasCharacter
        ? `BLENDING (CRITICAL — this is what separates amateur from pro):
- DEPTH LAYERING: The headline letters appear PARTIALLY BEHIND the subject's body — e.g. the model's arm or shoulder OVERLAPS and OCCLUDES 1-2 letters, creating depth. The text exists in the mid-ground between background and subject.
- 3D PRESENCE: Letters have physical thickness (like 3D extruded signage), catch the same key light as the subject, and cast soft shadows on the background.
- COLOUR INTEGRATION: Text colour picks up tones from the scene — if the lighting is warm amber, the text has a subtle warm gradient. If the product is red, the text has a faint red reflection or glow.
Think: Nike "JUST DO IT" campaign posters where the massive white letters sit behind the athlete's body, partially hidden by their silhouette, with the same dramatic lighting as the rest of the scene.`
        : `BLENDING (CRITICAL — this is what separates amateur from pro):
- ENVIRONMENT INTEGRATION: The text wraps around or interacts with the product — letters curve around the product surface, or the product sits ON TOP of certain letters creating occlusion.
- 3D EXTRUSION: Letters are rendered as physical 3D objects in the scene with thickness, specular highlights, and shadows matching the product's lighting.
- MATERIAL TEXTURE: The text surface matches the scene mood — chrome/metallic for premium, neon-glow for creative, matte concrete for editorial, holographic for futuristic.
Think: Luxury product ads where massive gold-embossed letters frame the product, or sneaker ads where the shoe sits on top of a giant 3D "AIR" with the same dramatic lighting.`

      sections.push(`COMPOSITIONAL BLEND TYPOGRAPHY (NOT an overlay — text is PART of the image):
${textEntries.join('\n')}

${blendTechniques}

DO NOT generate flat text sitting on top of the image. The text must have DEPTH, INTERACTION, and MATERIAL PRESENCE in the scene. If the text looks like it was added in a text editor after the photo was taken, you have FAILED.`)
    }
  }

  // ═══ 7. Aspect ratio ═══
  const ar = input.aspectRatio || '1:1'
  const arDesc: Record<string, string> = {
    '1:1': 'Square 1:1 — compose all elements centered, balanced symmetry',
    '9:16': 'Vertical 9:16 (Story/Reels) — tall frame, subject fills vertical space, text stacks vertically, use full height',
    '16:9': 'Wide 16:9 (cinematic/banner) — panoramic, subject on one side with product and text balanced across width',
    '4:5': 'Vertical 4:5 (Instagram post) — slightly taller than wide, standard portrait composition',
  }
  sections.push(`ASPECT RATIO: ${arDesc[ar] || arDesc['1:1']}
Compose every element (subject, product, text, background) to fill this format naturally. Do NOT leave dead space.`)

  // ═══ 8. Quality enforcement ═══
  const noTextAvoid = hasTextOverlay ? '' : ', NO text/words/letters/numbers/brand names in the image'
  sections.push(`QUALITY MANDATE (CRAZY GOOD — campaign-grade only):
Your prompt must produce an image that looks like it was shot by a top creative agency (Wieden+Kennedy, TBWA, Ogilvy) for a premium brand. You MUST specify in the prompt:
- Camera angle: state it explicitly (e.g. "Shot from a low angle, camera near ground level...", "Overhead down-angle view...", "Three-quarter profile...")
- Exact lighting rig (key light angle, fill ratio, rim/edge light, bounce)
- Camera: lens mm, f-stop, shutter if motion, depth of field
- Colour grading: cinematic LUT name or tone description
- Texture quality: 8K, photorealistic, film grain if editorial, dewy/matte as appropriate
- End with AVOID line (MUST include${hasTextOverlay ? '' : ': "no text, no words, no letters, no numbers, no brand names, no typography"'})

Write the prompt NOW. Output ONLY the prompt text.`)

  content.push({
    type: 'text',
    text: sections.join('\n\n'),
  })

  return content
}
