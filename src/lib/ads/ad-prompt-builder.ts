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
  type CharacterIdentity,
  getAdPreset,
  resolveStylePackForPreset,
  resolveTextSystemForPreset,
  buildFallbackPrompt,
} from './ad-styles'
import { AD_STYLE_EXAMPLES, type AdStyleExample } from './ad-style-examples'

const PROMPT_MODEL = process.env.AD_PROMPT_MODEL?.trim() || 'gpt-4o'
/** Timeout for GPT prompt build (ms). On timeout we fall back to template prompt. */
const PROMPT_BUILD_TIMEOUT_MS = 45_000
/** Max prompt length we pass to image model (Gemini). Longer prompts are truncated with warning. */
const MAX_PROMPT_LENGTH = 4000

const STYLIZED_BLUR_PRESETS = new Set<string>(['CREATIVE_CINEMATIC', 'SPORTS_DYNAMIC'])

// ═══════════════════════════════════════════════════════════════
// PRESET → STYLE EXAMPLE MAPPING
// Each preset maps to the most relevant training examples so
// GPT-4o can study them before writing the final prompt.
// ═══════════════════════════════════════════════════════════════

const PRESET_EXAMPLE_MAP: Record<string, string[]> = {
  UGC_CANDID: [
    'street-crosswalk-high-angle-candid',
    'urban-crosswalk-sporty-streetwear-motion',
    'high-angle-zebra-crossing-mens-casual',
    'editorial-tropical-night-ruffled-collar',
    'diptych-overpass-dusk-contemplative',
    'lifestyle-gas-station-night-porsche-medellin',
  ],
  UGC_STREET: [
    'editorial-skyscraper-low-angle-sneaker-hero',
    'street-crosswalk-high-angle-candid',
    'street-alley-bandana-crouch',
    'urban-crosswalk-sporty-streetwear-motion',
    'high-angle-zebra-crossing-mens-casual',
    'editorial-denim-corset-faux-fur-wall',
    'raw-analog-lacoste-tennis-court',
    'editorial-warehouse-bucket-hat-sneaker',
  ],
  EDITORIAL_PREMIUM: [
    'overhead-bed-editorial-contemplative',
    'editorial-composite-leather-projected-face',
    'editorial-side-profile-bouquet-minimal',
    'editorial-winter-mountain-faux-fur',
    'editorial-sheer-patent-red-backdrop',
    'editorial-trench-directors-chair-red',
    'editorial-vintage-academic-armchair',
    'editorial-cloud-sky-contemplative',
  ],
  EDITORIAL_FASHION: [
    'editorial-studio-extreme-kick-monochrome',
    'editorial-denim-corset-faux-fur-wall',
    'editorial-composite-leather-projected-face',
    'editorial-low-angle-metal-jewelry-watch',
    'editorial-split-gel-rust-checkerboard',
    'editorial-white-studio-forced-perspective-hand',
    'editorial-newspaper-set-neon-jacket',
    'reeded-glass-neon-green-tracksuit',
  ],
  EDITORIAL_STREET: [
    'street-crosswalk-high-angle-candid',
    'street-alley-bandana-crouch',
    'urban-crosswalk-sporty-streetwear-motion',
    'editorial-denim-corset-faux-fur-wall',
    'raw-analog-lacoste-tennis-court',
    'high-angle-zebra-crossing-mens-casual',
    'editorial-night-fisheye-car-crouch',
  ],
  EDITORIAL_RETRO: [
    'editorial-vintage-doorway-flash-70s',
    'editorial-office-flash-foot-foreground',
    'raw-analog-lacoste-tennis-court',
    'editorial-trench-directors-chair-red',
    'editorial-vintage-academic-armchair',
  ],
  EDITORIAL_CONCEPTUAL: [
    'street-city-crossing-stillness-daylight',
    'metro-platform-stillness-motion-blur',
    'reeded-glass-neon-green-tracksuit',
    'editorial-composite-leather-projected-face',
    'editorial-trio-bench-upward-gaze',
    'diptych-overpass-dusk-contemplative',
  ],
  CREATIVE_CINEMATIC: [
    'editorial-skyscraper-low-angle-sneaker-hero',
    'follow-cam-snowboard-powder-jump',
    'editorial-night-fisheye-car-crouch',
    'urban-crosswalk-sporty-streetwear-motion',
    'metro-platform-stillness-motion-blur',
    'lifestyle-gas-station-night-porsche-medellin',
    'diptych-overpass-dusk-contemplative',
    'street-city-crossing-stillness-daylight',
  ],
  CREATIVE_SURREAL: [
    'creative-sci-fi-cryogenic-helmet-portrait',
    'editorial-trio-bench-upward-gaze',
    'editorial-newspaper-set-neon-jacket',
  ],
  CREATIVE_BOLD_COLOR: [
    'reeded-glass-neon-green-tracksuit',
    'editorial-low-angle-metal-jewelry-watch',
    'editorial-sheer-patent-red-backdrop',
    'studio-red-backdrop-caesars-cap',
    'editorial-split-gel-rust-checkerboard',
    'editorial-white-studio-forced-perspective-hand',
    'low-angle-yellow-blocks-bomber-sneaker',
  ],
  SPORTS_DYNAMIC: [
    'editorial-studio-extreme-kick-monochrome',
    'follow-cam-snowboard-powder-jump',
    'editorial-warehouse-bucket-hat-sneaker',
    'raw-analog-lacoste-tennis-court',
    'urban-crosswalk-sporty-streetwear-motion',
    'low-angle-yellow-blocks-bomber-sneaker',
    'studio-high-angle-hands-frame-face',
  ],
  PRODUCT_LIFESTYLE: [
    'lifestyle-gas-station-night-porsche-medellin',
    'editorial-winter-mountain-faux-fur',
    'urban-crosswalk-sporty-streetwear-motion',
    'editorial-vintage-academic-armchair',
    'editorial-trench-directors-chair-red',
  ],
  PERF_BEST_QUALITY: [
    'street-city-crossing-stillness-daylight',
    'overhead-bed-editorial-contemplative',
    'editorial-composite-leather-projected-face',
    'editorial-side-profile-bouquet-minimal',
    'editorial-sheer-patent-red-backdrop',
    'editorial-trench-directors-chair-red',
    'lifestyle-gas-station-night-porsche-medellin',
  ],
}

const IDENTITY_EXAMPLE_MAP: Partial<Record<CharacterIdentity, string[]>> = {
  indian_woman_modern: ['editorial-tropical-night-ruffled-collar', 'editorial-side-profile-bouquet-minimal', 'street-crosswalk-high-angle-candid'],
  indian_man_modern: ['editorial-trench-directors-chair-red', 'high-angle-zebra-crossing-mens-casual', 'editorial-dark-blue-bape-sweater'],
  south_asian_modern: ['editorial-tropical-night-ruffled-collar', 'editorial-cloud-sky-contemplative', 'street-crosswalk-high-angle-candid'],
}

const NON_INDIAN_BIASED_EXAMPLES = new Set<string>([
  'editorial-trench-directors-chair-red',
  'editorial-cloud-sky-contemplative',
  'street-crosswalk-high-angle-candid',
  'studio-red-backdrop-caesars-cap',
])

const TEXT_SYSTEM_EXAMPLES: Record<string, string[]> = {
  luxury_masthead: ['luxury-masthead-motion-blur'],
  highstreet_panel: ['highstreet-poster-panel-layout'],
  sports_brush: ['sports-brush-slogan-packshot', 'sports-handheld-vertical-type'],
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

function getStyleExamplesForPreset(input: AdGenerationInput, hasCharacter: boolean): AdStyleExample[] {
  const presetId = input.preset
  let ids = PRESET_EXAMPLE_MAP[presetId] || []
  const identity = input.characterIdentity
  const hasIndianIdentity =
    identity === 'indian_woman_modern' || identity === 'indian_man_modern' || identity === 'south_asian_modern'

  // If user explicitly chose a character on a product-only preset, swap in
  // character-inclusive references so GPT-4o generates with a model
  if (hasCharacter && PRODUCT_ONLY_PRESETS.has(presetId)) {
    ids = ['text-based-dynamic-magenta', 'creative-bold-color-studio', 'creative-fashion-kick-identity']
  }

  if (hasCharacter && identity && IDENTITY_EXAMPLE_MAP[identity]) {
    const identityIds = IDENTITY_EXAMPLE_MAP[identity] || []
    const filteredPresetIds = hasIndianIdentity
      ? ids.filter((id) => !NON_INDIAN_BIASED_EXAMPLES.has(id))
      : ids
    ids = [...identityIds, ...filteredPresetIds]
  }

  const hasTextRequested = Boolean(
    input.textOverlay && (input.textOverlay.headline || input.textOverlay.subline || input.textOverlay.tagline)
  )
  if (hasTextRequested) {
    const textSystem = resolveTextSystemForPreset(input.preset)
    const textIds = TEXT_SYSTEM_EXAMPLES[textSystem] || []
    ids = [...textIds, ...ids]
  }

  const uniqueIds = Array.from(new Set(ids))

  return uniqueIds
    .map((id) => AD_STYLE_EXAMPLES.find((e) => e.id === id))
    .filter(Boolean)
    .slice(0, 6) as AdStyleExample[]
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
    const raw = await withTimeout(
      buildPromptWithGPT(preset, input, productImageBase64, faceAnchor),
      PROMPT_BUILD_TIMEOUT_MS,
      'Ad prompt build'
    )
    const prompt = sanitizeAndCapPrompt(raw)
    return { prompt, model: PROMPT_MODEL, fallback: false }
  } catch (err) {
    console.warn('[AdPromptBuilder] GPT prompt build failed, using fallback:', err)
    const prompt = buildFallbackPrompt(input)
    return { prompt, model: 'fallback', fallback: true }
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

/** Strip markdown/code fences, trim, and cap length for image model. */
function sanitizeAndCapPrompt(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```')) s = s.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
  s = s.trim()
  if (s.length > MAX_PROMPT_LENGTH) {
    console.warn(`[AdPromptBuilder] Prompt length ${s.length} exceeds ${MAX_PROMPT_LENGTH}, truncating`)
    s = s.slice(0, MAX_PROMPT_LENGTH - 20) + '…'
  }
  return s
}

function buildStrategicIntelligenceBlock(
  input: AdGenerationInput,
  preset: AdPreset,
  hasCharacter: boolean,
  hasTextOverlay: boolean
): string {
  const platformFocus = input.platforms.includes('google')
    ? 'conversion clarity and readability at small ad sizes'
    : input.platforms.includes('instagram')
      ? 'thumb-stop impact in feed/reels with immediate visual hook in first glance'
      : input.platforms.includes('facebook')
        ? 'clear story + trust + product comprehension for mixed-age audiences'
        : 'high visual impact with brand-safe composition'

  const ratioFocus =
    input.aspectRatio === '9:16'
      ? 'vertical storytelling with strong top/middle/bottom hierarchy'
      : input.aspectRatio === '16:9'
        ? 'wide cinematic composition with clear left-right balance'
        : input.aspectRatio === '4:5'
          ? 'portrait feed optimization with central product readability'
          : 'balanced square composition with strong central focal structure'

  const textFocus = hasTextOverlay
    ? 'integrate typography as scene object with depth and occlusion'
    : 'pure photography output with zero text elements'

  const characterFocus = hasCharacter
    ? 'character-product interaction must be obvious and physically believable'
    : 'product hero must remain dominant with no accidental human subject'

  return `STRATEGIC INTELLIGENCE OBJECTIVE:
- Ad objective: ${platformFocus}
- Composition objective: ${ratioFocus}
- Text objective: ${textFocus}
- Subject objective: ${characterFocus}
- Preset fidelity: stay true to "${preset.name}" visual DNA while maximizing realism and production polish.`
}

function buildStylePackDirective(input: AdGenerationInput): string {
  const stylePack = input.stylePack || resolveStylePackForPreset(input.preset)
  if (stylePack === 'luxury') {
    return `STYLE PACK (LOCKED): LUXURY
Prioritize premium editorial polish, elevated materials, cinematic lighting, controlled color harmony, and sophisticated fashion composition.`
  }
  if (stylePack === 'sports') {
    return `STYLE PACK (LOCKED): SPORTS
Prioritize athletic energy, dynamic body language, motion-ready framing, bold hero angles, and performance-commercial realism.`
  }
  return `STYLE PACK (LOCKED): HIGH STREET
Prioritize contemporary retail campaign aesthetics, trend-forward styling, urban realism, and clean conversion-ready composition.`
}

function resolveIdentityDirective(input: AdGenerationInput): string {
  const identity = input.characterIdentity || 'global_modern'
  switch (identity) {
    case 'indian_woman_modern':
      return 'Identity direction: Indian woman with modern South Delhi fashion-forward styling. Explicitly avoid stereotypical cues (no tokenistic bindi or costume tropes unless user explicitly asks).'
    case 'indian_man_modern':
      return 'Identity direction: Indian man with modern South Delhi fashion-forward styling. Explicitly avoid stereotypical cues (no tokenistic cultural props unless user explicitly asks).'
    case 'south_asian_modern':
      return 'Identity direction: South Asian modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'east_asian_modern':
      return 'Identity direction: East Asian modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'middle_eastern_modern':
      return 'Identity direction: Middle Eastern modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'african_modern':
      return 'Identity direction: African modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'latina_modern':
      return 'Identity direction: Latina modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'european_modern':
      return 'Identity direction: European modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'north_american_modern':
      return 'Identity direction: North American modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'latin_american_modern':
      return 'Identity direction: Latin American modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'mediterranean_modern':
      return 'Identity direction: Mediterranean modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'south_east_asian_modern':
      return 'Identity direction: South East Asian modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'central_asian_modern':
      return 'Identity direction: Central Asian modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'pacific_islander_modern':
      return 'Identity direction: Pacific Islander modern identity with contemporary urban styling and non-stereotyped representation.'
    case 'mixed_heritage_modern':
      return 'Identity direction: Mixed-heritage modern identity with contemporary urban styling and non-stereotyped representation.'
    default:
      return 'Identity direction: Global modern casting and styling with non-stereotyped representation.'
  }
}

function buildIdentityCastingLock(input: AdGenerationInput): string {
  const identity = input.characterIdentity || 'global_modern'
  if (identity === 'indian_woman_modern') {
    return `CASTING LOCK (CRITICAL):
The model MUST clearly read as a modern Indian woman. Keep casting contemporary, urban, and premium (South Delhi high-street sensibility). Do NOT drift to non-Indian casting. Do NOT add tokenistic stereotypes, costumes, or clichéd cultural props unless user explicitly requests them.`
  }
  if (identity === 'indian_man_modern') {
    return `CASTING LOCK (CRITICAL):
The model MUST clearly read as a modern Indian man. Keep casting contemporary, urban, and premium (South Delhi high-street sensibility). Do NOT drift to non-Indian casting. Do NOT add tokenistic stereotypes, costumes, or clichéd cultural props unless user explicitly requests them.`
  }
  if (identity === 'south_asian_modern') {
    return `CASTING LOCK (CRITICAL):
The model MUST clearly read as South Asian with contemporary, non-stereotyped urban styling. Preserve realistic skin tone and facial structure; do not drift to unrelated identity casting.`
  }
  return `CASTING LOCK:
Honor the selected identity direction and keep casting consistent with the chosen people type.`
}

function buildFaceRealismLock(input: AdGenerationInput): string {
  const ct = input.characterType || 'none'
  const hasHuman = ct === 'human_female' || ct === 'human_male'
  if (!hasHuman) return ''

  return `FACE REALISM LOCK (CRITICAL):
- Photographic human skin only: visible pores, fine facial hair, natural under-eye texture, realistic lip texture.
- Preserve natural facial asymmetry and realistic proportions (eyes, nose, jaw, ears, hands).
- Keep skin tone truthful and consistent across face/neck/body with realistic undertones.
- Do NOT apply porcelain beauty-filter smoothing, waxy skin, plastic sheen, CGI doll look, or over-retouched glam blur.
- Hairline, brows, eyelashes, and flyaway strands must look natural and high-detail.
- Expression and gaze must be human and grounded, not mannequin-like.`
}

function isStylizedBlurPreset(presetId: string): boolean {
  return STYLIZED_BLUR_PRESETS.has(presetId)
}

function buildEnvironmentRealismLock(presetId: string): string {
  const allowStylizedBlur = isStylizedBlurPreset(presetId)

  return `ENVIRONMENT REALISM LOCK (CRITICAL):
- Background must stay physically believable with readable environmental objects and textures.
- Preserve scene geometry, object edges, and depth continuity (walls, trees, roads, furniture, skyline, props).
- Do NOT default to generic blur wash or artificial bokeh soup behind the subject.
- Use realistic depth behavior: medium/deep depth by default (roughly f/5.6-f/11 look) so subject and key background context both read clearly.
- Keep architectural lines, horizon edges, and environmental textures legible; avoid watercolor-like smear in distant regions.
- If motion blur is used, it must be directional and physically motivated (moving crowd, moving vehicle, shutter drag). Never blur the entire background uniformly.
- ${allowStylizedBlur
    ? 'Stylized blur is allowed only if motivated by motion, lens behavior, or the selected preset style. Keep background structure and scene depth readable.'
    : 'Avoid stylized blur, fake haze, over-diffusion, and excessive bokeh unless explicitly requested by the user.'}
- Keep lighting and shadows coherent across subject and environment so it feels like a real location, not composited mush.`
}

function buildAutoDirectorModeBlock(input: AdGenerationInput, hasCharacter: boolean): string {
  const cameraAuto = (input.cameraAngle || 'auto') === 'auto'
  const poseAuto = !input.subject?.pose
  const expressionAuto = !input.subject?.expression
  if (!cameraAuto && !poseAuto && !expressionAuto) return ''

  const variationIndex = Number(input.variationIndex || 0)
  const angleCycle = ['low', 'down/overhead', 'side profile', 'three-quarter', 'high', 'eye-level']
  const poseCycle = [
    'low-angle crouch with product-forward framing',
    'strong forward step with one limb/foot advancing toward lens',
    'side-profile stance with clean silhouette',
    'relaxed seated lean with asymmetrical body line',
    'dynamic stride with natural limb motion',
    'three-quarter standing fashion posture',
  ]
  const expressionCycle = [
    'confident direct gaze',
    'calm serious focus',
    'cool detached attitude',
    'subtle rebellious smirk',
    'introspective contemplative mood',
    'energetic playful confidence',
  ]

  const angleHint = angleCycle[variationIndex % angleCycle.length]
  const poseHint = poseCycle[variationIndex % poseCycle.length]
  const expressionHint = expressionCycle[variationIndex % expressionCycle.length]

  const lines: string[] = []
  if (cameraAuto) {
    lines.push(
      'Camera angle is AUTO: intelligently choose ONE dominant angle based on scene geometry and product salience from this set: low, high, down/overhead, side profile, three-quarter, eye-level, dutch.'
    )
    lines.push(
      'Do not default repeatedly to eye-level framing. Prefer stronger perspective when it improves fashion impact (e.g., low-angle sneaker hero, overhead street grid, side-profile silhouette).'
    )
    lines.push(
      `Variation index ${variationIndex}: bias this generation toward "${angleHint}" while keeping scene realism and preset fidelity.`
    )
  }
  if (hasCharacter && poseAuto) {
    lines.push(
      'Pose is AUTO: select a physically natural but editorial pose that matches camera angle and product type (crouch, forward step, seated lean, side-profile stance, dynamic stride).'
    )
    lines.push(`Variation index ${variationIndex}: prefer pose family "${poseHint}" for this render.`)
  }
  if (hasCharacter && expressionAuto) {
    lines.push(
      'Expression is AUTO: select an intentional expression that matches narrative mood (confident, calm serious, cool detached, subtle smirk, introspective), never blank/mannequin.'
    )
    lines.push(`Variation index ${variationIndex}: prefer expression family "${expressionHint}" for this render.`)
  }

  return `AUTO DIRECTOR MODE (MANDATORY):\n- ${lines.join('\n- ')}`
}

function buildPhotographicRealismLock(): string {
  return `PHOTOGRAPHIC REALISM LOCK (INFLUENCER-GRADE, CRITICAL):
- Single coherent photograph: subject must be grounded in the scene with believable contact shadows and ambient occlusion where body/feet meet surfaces.
- Enforce light physics: natural falloff (inverse-square behavior), no uniform brightness across face/body/background, and coherent shadow direction/softness.
- Preserve camera realism: subtle natural sensor grain/noise (especially in shadow areas), mild lens imperfection, and no over-processed HDR polish.
- Keep skin and hair human: visible pores, micro-texture, fine flyaways, natural asymmetry. No waxy/plastic/airbrushed finish.
- Environment materials must remain lived-in and believable (micro-contrast, texture variation, natural imperfections), not CGI-smooth.
- Avoid mannequin/catalog look unless explicitly requested: prioritize candid physical plausibility over synthetic perfection.`
}

function buildBrandMarkIntegrityLock(): string {
  return `BRAND MARK INTEGRITY (NON-NEGOTIABLE):
- Do NOT invent logos, letters, words, or brand marks that are not clearly visible in the input product image or explicitly provided by the user.
- If brand text/mark is unclear, obscured, or not legible in the source, keep it minimal/neutral instead of hallucinating fake text.
- No random sleeve print, fake wordmarks, or pseudo-brand typography on garments/products.
- Preserve real visible product markings faithfully; never fabricate new branding.`
}

function buildDepthPolicyCameraOverride(presetId: string): string {
  if (isStylizedBlurPreset(presetId)) {
    return 'Depth policy: Controlled stylized blur is allowed for this preset only when motivated by action, lens physics, or atmosphere. Subject and primary environment geometry must remain readable.'
  }
  return 'Depth policy: Do NOT use generic shallow-DoF/bokeh backgrounds. Keep medium depth with readable environmental objects and realistic spatial continuity.'
}

function buildTextArtDirectionBlock(input: AdGenerationInput, preset: AdPreset): string {
  const textSystem = resolveTextSystemForPreset(input.preset)
  if (textSystem === 'sports_brush') {
    return `TEXT ART DIRECTION (SPORTS SYSTEM):
Use a two-layer sports typography system:
1) Primary headline in ultra-bold condensed uppercase sans (black/white anchor).
2) Secondary energetic brush-stroke script crossing one key word for impact.
Keep product legibility first. Typography should feel kinetic and campaign-ready like elite footwear posters, without copying any external brand words.
Render text as realistic print/paint/graphic treatment integrated in the scene plane — NOT thick toy-like 3D letters, NOT clay/plastic/wax material.`
  }

  if (textSystem === 'luxury_masthead') {
    return `TEXT ART DIRECTION (LUXURY SYSTEM):
Use oversized high-contrast serif masthead typography with elegant spacing and restrained composition.
Allow partial occlusion by subject/motion for depth, as seen in premium fashion films and print covers.
Keep hierarchy minimal and sophisticated: one dominant headline, one subtle support line.
Typography should read as premium print/editorial masthead treatment, not inflated 3D object or molded material.`
  }

  return `TEXT ART DIRECTION (HIGH STREET SYSTEM):
Use modular poster hierarchy with clean commercial structure:
- Strong top headline
- Secondary support line
- Optional lower information block
Typography must be highly legible, grid-aligned, and integrated with the image plane, not a flat afterthought.
Prefer realistic poster/signage/paint treatment over heavy 3D extrusion; avoid synthetic clay-like letterforms.`
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
    temperature: 0.35,
    max_tokens: 1500,
  })

  const text = response.choices[0]?.message?.content?.trim()
  if (!text || text.length < 50) {
    throw new Error('GPT returned empty or too-short prompt')
  }
  if (text.length > MAX_PROMPT_LENGTH) {
    console.warn(`[AdPromptBuilder] Raw prompt ${text.length} chars (will be capped to ${MAX_PROMPT_LENGTH})`)
  }
  console.log(`[AdPromptBuilder] GPT-4o prompt built (${text.length} chars)`)
  return text
}

function buildSystemMessage(hasText: boolean): string {
  return `You are a PHOTOSHOOT AD DIRECTOR and elite advertising creative director. You write image-generation prompts for Gemini 3 Pro. You think in full productions: lighting design, set mood, lens choice, colour grade, and one killer visual idea. Your prompts read like a director's brief to a DP and stylist — specific, obsessive, production-quality.

You receive: a product image, a creative brief, and REFERENCE PROMPTS from real campaigns. Study the references — absorb their density and quality. Your output must match or exceed them. GO CRAZY on style: every frame should look like it belongs in a Vogue spread, a luxury hero spot, or a global lookbook. No safe, generic descriptions.
CRITICAL: Reference prompts can contain example brand words. Treat those words as style examples only — NEVER copy those brand names/slogans unless the user explicitly provided them in the current brief text fields.

YOUR JOB: Write ONE narrative-style prompt (NOT keyword stuffing) that generates a STUNNING, campaign-grade ad image. Think like a director calling the shot: "Key from 45° left, half-stop under; rim from behind right to separate from the drop; fill at 2:1 so we keep shape but don't flatten." Name the mood, the light quality, the palette, the lens.

═══ PRODUCTION-QUALITY LIGHTING (NON-NEGOTIABLE) ═══
Every image must feel like a real photoshoot with a real lighting rig. Be specific: key light angle (e.g. 45° front-left), fill ratio (e.g. 2:1, 3:1), rim or backlight for separation, beauty dish vs softbox vs hard light, colour temperature (warm 3200K, cool 5600K, golden hour). Describe how light hits skin (sculpted cheekbones, catchlights in eyes, subtle rim on hair) and product (specular highlights, fabric weave, material truth). 8K resolution, tack-sharp where it matters. Default to realistic medium depth of field that preserves important background context; only use strong blur when the brief explicitly requires it. No AI mush, no plastic skin, no flat single-source lighting. Specify lens (e.g. 85mm f/1.4), f-stop, and a clear lighting setup in your prompt. Anatomy correct, hands natural, proportions human.

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
   LOOK AT the product image. Describe EXACTLY: visible brand, colourway (#hex if possible), material (mesh/leather/suede/canvas/satin), shape, distinctive features (logo placement, sole colour, stitching pattern, hardware). Be forensically specific.
   If any logo/wordmark is unreadable or not visible, do NOT invent text/branding. Keep markings neutral rather than hallucinating fake letters.

3. NARRATIVE DENSITY: 300–700 words of flowing visual description. Think like a director: what does the set smell like? Where does the light come from in the room? What's the one thing that makes this frame iconic?
   Include: lighting rig (key at 45°, fill ratio, rim angle, quality of light — soft/hard/feathered), camera (24/35/50/85mm, f/stop, shutter speed if motion), colour palette (use hex codes: "deep crimson #8B0000", "electric cyan #00E5FF"), texture (8K, film grain weight, dewy/matte skin, fabric weave), composition (rule of thirds, leading lines, negative space). Aim for the most amazing, memorable look possible — production-quality lighting and styling in every sentence.
   Name photographers when relevant: Guy Bourdin, Tim Walker, Annie Leibovitz, Martin Parr, Peter Lindbergh, Mario Testino, Inez & Vinoodh.

${hasText ? `4. TYPOGRAPHY = COMPOSITIONAL BLEND (text has been requested by the user).
   Use ONLY the EXACT text strings provided in the brief. Do NOT invent new words, slogans, logos, brand names, numbers, hashtags, or taglines.
   Text is DESIGNED INTO the scene — not added on top. Use 2+ blending techniques:
   a) DEPTH LAYERING: letters BEHIND subject (subject's body occludes parts of text)
   b) 3D EXTRUSION: letters have physical thickness, catch scene lighting, cast shadows
   c) ENVIRONMENT MASKING: text wraps surfaces, reflects in wet ground, printed on walls
   d) COLOUR BLEED: text gradient matches scene palette, glows onto nearby surfaces
   e) PARTIAL OCCLUSION: product/hand/hair overlaps parts of text
   f) MATERIAL TEXTURE: chrome, neon tube, embossed leather, frosted glass

   NEVER say "add text" or "text overlay". Instead describe physical presence: "massive ultra-bold white sans-serif letters '[HEADLINE]' — the first characters appear BEHIND the subject's shoulder, letters have 3mm depth with soft shadow, same dramatic rim lighting as the subject, text occupies 30% of frame width."` : `4. NO TEXT / NO TYPOGRAPHY (CRITICAL — NON-NEGOTIABLE).
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
  const strictRealism = input.strictRealism !== false

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
  const examples = getStyleExamplesForPreset(input, hasCharacter)
  if (examples.length > 0) {
    const exampleBlocks = examples
      .slice(0, 5) // include more angle/expression references for stronger style transfer
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
    if (input.preset === 'PRODUCT_LIFESTYLE') {
      sceneGuide = `Lifestyle ad with ${ct === 'animal' ? 'a photorealistic animal' : 'a model'} and the product in a real-world context (minimal room, gas station, urban night, or neutral interior). Product primary and clearly visible; model secondary. Premium lighting, campaign-quality.`
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
      ? 'Camera angle: AUTO-DIRECTED. Choose the most impactful angle for this preset and product; explicitly state the chosen angle in the prompt (e.g. "Shot from a low angle...", "Overhead down-angle...", "Side profile composition...").'
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

  if (strictRealism && !isStylizedBlurPreset(input.preset)) {
    avoidTerms = [...avoidTerms, 'generic blurry background', 'over-bokeh', 'background mush']
  }

  sections.push(`CREATIVE BRIEF:
Preset: ${preset.name} (${preset.category})
Scene direction: ${sceneGuide}
Lighting direction: ${preset.lightingGuide}
Camera direction: ${preset.cameraGuide}
${buildDepthPolicyCameraOverride(input.preset)}
${angleInstruction}
Must avoid: ${avoidTerms.join(', ')}`)
  sections.push(buildStylePackDirective(input))
  const autoDirectorMode = buildAutoDirectorModeBlock(input, hasCharacter)
  if (autoDirectorMode) sections.push(autoDirectorMode)
  sections.push(buildEnvironmentRealismLock(input.preset))
  if (strictRealism) {
    sections.push(buildPhotographicRealismLock())
    sections.push(buildBrandMarkIntegrityLock())
  }

  const hasTextOverlay = !!(input.textOverlay && (input.textOverlay.headline || input.textOverlay.subline || input.textOverlay.tagline))
  sections.push(buildStrategicIntelligenceBlock(input, preset, hasCharacter, hasTextOverlay))
  if (input.preset === 'PERF_BEST_QUALITY') {
    sections.push(`BEST QUALITY MODE (MANDATORY):
Prioritize maximum photoreal fidelity and premium ad finish over stylistic experimentation.
No visual gimmicks unless they improve realism or product salience.
Every output decision should improve conversion readiness and perceived production value.`)
  }

  // ═══ 3. Product instruction ═══
  if (productImageBase64) {
    sections.push(`PRODUCT (attached image — LOOK AT IT):
Describe the EXACT product you see: type (shoe/shirt/bag/accessory), visible brand marks (only if clearly legible), specific colourway, materials (mesh/leather/suede/canvas/satin), shape/silhouette, sole, hardware, stitching, distinctive features. Be forensically specific — "red Nike Air Max 97 with white swoosh, translucent air bubble sole, mesh upper with reflective panels" NOT "a pair of red sneakers". The product in the generated image MUST be a precise visual match.
If logo text or wordmarks are not clearly readable in the source image, do NOT invent brand letters; keep marks neutral/minimal.`)
  }

  // ═══ 4. Character (ALWAYS respected when user selects one) ═══
  if (hasCharacter) {
    if (ct === 'animal') {
      const animal = input.animalType || 'fox'
      const style = input.characterStyle || 'natural, photorealistic'
      sections.push(`CHARACTER (USER SELECTED — MUST INCLUDE):
A photorealistic CGI 3D rendered ${animal} wearing or interacting with the product. ${style} style. Soft diffused studio lighting with realistic scene depth and readable environment details (no generic background blur). Ultra-high detail with sharp fur/feather textures. Bold saturated colors, contemporary luxury brand aesthetic — premium yet playfully absurd.
The ${animal} MUST be prominent in the image — not a background element. It is the model of this ad.`)
    } else {
      const gender = ct === 'human_male' ? 'man' : 'woman'
      const age = input.characterAge || input.subject?.ageRange || '22-30'
      const style = input.characterStyle || 'natural, confident'
      const pose = input.subject?.pose || 'dynamic, editorial'
      const expression = input.subject?.expression || 'confident, direct gaze'
      sections.push(`CHARACTER (USER SELECTED — MUST INCLUDE):
A young ${gender} (age ${age}), ${style} style. ${pose} pose, ${expression}. ${resolveIdentityDirective(input)} ${buildIdentityCastingLock(input)} Realistic skin with visible pores and texture, natural body proportions, anatomically correct. The ${gender} wears or holds the product. Describe a specific complementary outfit.
The ${gender} MUST be prominent in the image — not just hands or silhouette. Show at least three-quarter body. This is a model-driven ad.`)
    }
  }

  const faceRealismLock = buildFaceRealismLock(input)
  if (faceRealismLock) {
    sections.push(faceRealismLock)
  }

  // ═══ 5. Face identity lock ═══
  if (faceAnchor && input.lockFaceIdentity) {
    sections.push(`FACE IDENTITY LOCK (CRITICAL — NON-NEGOTIABLE):
Preserve EXACT facial structure, bone geometry, skin tone, and features from the reference person image:
${faceAnchor}
Face is IMMUTABLE. Do NOT alter any facial feature. Include explicit instruction: "Preserve the exact face, jawline, eye shape, skin tone, and facial proportions of the reference person."`)
  }

  // ═══ 6. Text — COMPOSITIONAL BLEND TYPOGRAPHY or NO TEXT ═══
  if (!hasTextOverlay) {
    // CRITICAL: Explicitly tell GPT-4o NOT to add any text
    sections.push(`TEXT: NONE. Do NOT include ANY text, words, letters, numbers, brand names, slogans, or typography in the image, even if reference prompts contain text. The image must be purely visual — no written content whatsoever. This is a photography-only composition.`)
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
      textEntries.push(`HEADLINE: "${to.headline}" — rendered in ${fontDesc}, MASSIVE scale (occupying 25-40% of frame width). Keep exact spelling and letter order character-by-character. Position: ${placement} of frame.`)
    }
    if (to.subline) {
      textEntries.push(`SUBLINE: "${to.subline}" — same font family but lighter weight, 40% the size of headline, positioned below headline.`)
    }
    if (to.tagline) {
      textEntries.push(`TAGLINE: "${to.tagline}" — small caps or italic variant, positioned near bottom edge of frame as anchor.`)
    }

    if (textEntries.length > 0) {
      const allowedText = [to.headline, to.subline, to.tagline]
        .filter((v): v is string => Boolean(v && v.trim()))
        .map((v) => `"${v}"`)
        .join(', ')

      // Pick blending techniques based on whether there's a character
      const blendTechniques = hasCharacter
        ? `BLENDING (CRITICAL — this is what separates amateur from pro):
- DEPTH LAYERING: The headline letters appear PARTIALLY BEHIND the subject's body — e.g. the model's arm or shoulder OVERLAPS and OCCLUDES 1-2 letters, creating depth. The text exists in the mid-ground between background and subject.
- SURFACE INTEGRATION: Treat text like realistic printed signage, painted wall typography, or billboard ink that receives the same light direction as the scene.
- COLOUR INTEGRATION: Text colour picks up tones from the scene — if lighting is warm amber, text can carry a subtle warm tint while staying legible.
Think: Nike "JUST DO IT" campaign posters where the massive white letters sit behind the athlete's body, partially hidden by their silhouette, with the same dramatic lighting as the rest of the scene.`
        : `BLENDING (CRITICAL — this is what separates amateur from pro):
- ENVIRONMENT INTEGRATION: The text wraps around or interacts with the product — letters curve around the product surface, or the product sits ON TOP of certain letters creating occlusion.
- PRINT-REAL MATERIALITY: Letters should feel like realistic print/paint/signage materials, not inflated 3D blobs.
- MATERIAL TEXTURE: The text surface matches scene mood while remaining believable and sharp for ad readability.
Think: Luxury product ads where massive gold-embossed letters frame the product, or sneaker ads where the shoe sits on top of a giant 3D "AIR" with the same dramatic lighting.`

      sections.push(`${buildTextArtDirectionBlock(input, preset)}

TEXT CONTENT LOCK (NON-NEGOTIABLE):
Allowed text strings in-image: ${allowedText}.
Use ONLY these exact strings. Do NOT invent extra words, extra taglines, extra numbers, hashtags, or any other brand text.

COMPOSITIONAL BLEND TYPOGRAPHY (NOT an overlay — text is PART of the image):
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
- Background fidelity: environment objects must stay readable and realistic (avoid default background mush/over-bokeh unless stylistically required)
- Physics fidelity: coherent contact shadows, realistic light falloff, no pasted-on subject look, no fake brand text/wordmarks
- Realism guardrail: NO clay/wax/plastic/melted text, NO toy-like CGI letters, NO synthetic doll skin, NO over-smoothed faces.
- End with AVOID line (MUST include${hasTextOverlay ? '' : ': "no text, no words, no letters, no numbers, no brand names, no typography"'})

Write the prompt NOW. Output ONLY the prompt text.`)

  content.push({
    type: 'text',
    text: sections.join('\n\n'),
  })

  return content
}
