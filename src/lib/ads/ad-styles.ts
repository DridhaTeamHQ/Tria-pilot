/**
 * AD STYLE PRESETS — PRODUCTION GRADE
 *
 * Categorized preset system for ad generation.
 * Brands select from these presets — GPT-4o crafts the final prompt.
 *
 * Categories: UGC | Editorial | Commercial | Creative | Standalone | Indian Fashion
 */

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const AD_PRESET_IDS = [
  // UGC
  'UGC_CANDID',
  'UGC_STORY',
  'UGC_REEL',
  'UGC_TESTIMONIAL',
  // Editorial
  'EDITORIAL_PREMIUM',
  'EDITORIAL_FASHION',
  'EDITORIAL_BEAUTY',
  'EDITORIAL_STREET',
  // Commercial
  'PRODUCT_LIFESTYLE',
  'STUDIO_POSTER',
  'PRODUCT_HERO',
  // Creative
  'CREATIVE_SURREAL',
  'CREATIVE_CINEMATIC',
  'CREATIVE_TEXT_DYNAMIC',
  'CREATIVE_BOLD_COLOR',
  // Standalone Product
  'STANDALONE_CLEAN',
  'STANDALONE_SURREAL',
  // Indian Fashion
  'INDIAN_FESTIVE',
  'INDIAN_ETHNIC',
] as const

export type AdPresetId = (typeof AD_PRESET_IDS)[number]

export type AdPresetCategory =
  | 'ugc'
  | 'editorial'
  | 'commercial'
  | 'creative'
  | 'standalone'
  | 'indian'

export type Platform = 'instagram' | 'facebook' | 'google' | 'influencer'

export type CaptionTone = 'casual' | 'premium' | 'confident'

export type CtaType = 'shop_now' | 'learn_more' | 'explore' | 'buy_now'

export type CharacterType = 'human_female' | 'human_male' | 'animal' | 'none'

export type FontStyle = 'serif' | 'sans-serif' | 'handwritten' | 'bold-display'

export type TextPlacement =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center'

export interface TextOverlayConfig {
  headline?: string
  subline?: string
  tagline?: string
  placement?: TextPlacement
  fontStyle?: FontStyle
}

export interface AdPreset {
  id: AdPresetId
  name: string
  description: string
  category: AdPresetCategory
  icon: string
  whenToUse: string[]
  platforms: Platform[]
  /** Scene, lighting, and composition guidance for the prompt builder */
  sceneGuide: string
  /** Lighting description for consistency */
  lightingGuide: string
  /** Camera/lens guidance */
  cameraGuide: string
  /** Negative terms to avoid */
  avoid: string[]
}

export interface AdGenerationInput {
  preset: AdPresetId
  campaignId?: string

  // Image inputs
  productImage?: string
  influencerImage?: string
  lockFaceIdentity?: boolean

  // Character
  characterType?: CharacterType
  animalType?: string
  characterStyle?: string
  characterAge?: string

  // Text overlay
  textOverlay?: TextOverlayConfig

  // Text controls
  headline?: string
  ctaType: CtaType
  captionTone?: CaptionTone

  // Platform selection
  platforms: Platform[]

  // Subject overrides (legacy, still supported)
  subject?: {
    gender?: 'male' | 'female' | 'unisex'
    ageRange?: string
    pose?: string
    expression?: string
  }
}

// ═══════════════════════════════════════════════════════════════
// PRESET DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const AD_PRESETS: AdPreset[] = [
  // ─── UGC ───
  {
    id: 'UGC_CANDID',
    name: 'UGC Candid',
    description: 'Authentic, relatable social media feel',
    category: 'ugc',
    icon: 'Camera',
    whenToUse: ['Instagram ads', 'Influencer content', 'Casual brands'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Real urban environment: sidewalk, café, simple indoor room. Authentic textures (concrete, walls, furniture) subtly present. Natural, unstaged, spontaneous moment.',
    lightingGuide:
      'Soft natural daylight, even illumination, gentle shadows matching environment. Skin texture and fabric clearly visible without smoothing.',
    cameraGuide:
      '35mm smartphone-style perspective, slightly off-center framing, shallow depth of field, natural social media look.',
    avoid: ['studio lighting', 'perfect symmetry', 'professional posing', 'dramatic shadows'],
  },
  {
    id: 'UGC_STORY',
    name: 'Story Style',
    description: 'Vertical, intimate, story-ready format',
    category: 'ugc',
    icon: 'Smartphone',
    whenToUse: ['Instagram Stories', 'Vertical ads', 'Direct-to-camera'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Close-up or selfie-style framing, direct eye contact with camera, intimate personal space. Home, bathroom mirror, bedroom, or close indoor setting.',
    lightingGuide:
      'Soft indoor side light from window, warm natural colour temperature, ring light or phone flash acceptable for authenticity.',
    cameraGuide:
      '26mm wide-angle (phone front camera), arm-length distance, slightly tilted for candid feel, 9:16 vertical composition.',
    avoid: ['studio backdrop', 'professional equipment visible', 'perfect framing'],
  },
  {
    id: 'UGC_REEL',
    name: 'Reel Energy',
    description: 'Dynamic, trend-ready, high-energy still',
    category: 'ugc',
    icon: 'Zap',
    whenToUse: ['Reels thumbnails', 'Trend-driven ads', 'Youth brands'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Dynamic angle implying motion or energy: walking, dancing, mid-gesture. Urban street, rooftop, or colourful backdrop. Action frozen in a moment.',
    lightingGuide:
      'Natural outdoor light or neon/ambient urban light. Slight motion blur acceptable for energy. Vibrant, saturated tones.',
    cameraGuide:
      '24-35mm wide angle, low or tilted perspective, slight barrel distortion for dynamism, 9:16 or 1:1.',
    avoid: ['static pose', 'studio setting', 'muted tones', 'slow feeling'],
  },
  {
    id: 'UGC_TESTIMONIAL',
    name: 'Testimonial',
    description: 'Trust-building, talking-to-camera feel',
    category: 'ugc',
    icon: 'MessageCircle',
    whenToUse: ['Review ads', 'Trust building', 'Testimonial content'],
    platforms: ['instagram', 'facebook', 'google'],
    sceneGuide:
      'Subject looking directly at camera, mid-shot (chest up), relaxed home or office background. Natural, honest, conversational. Product visible in hand or on body.',
    lightingGuide:
      'Soft natural light from side, no harsh shadows, warm inviting tone. Ring light glow acceptable.',
    cameraGuide:
      '35-50mm at eye level, subject centered, shallow depth of field softening background, webcam/phone quality feel.',
    avoid: ['dramatic poses', 'editorial styling', 'dark moody lighting'],
  },

  // ─── Editorial ───
  {
    id: 'EDITORIAL_PREMIUM',
    name: 'Premium Editorial',
    description: 'Magazine-quality, refined, luxury',
    category: 'editorial',
    icon: 'Sparkles',
    whenToUse: ['Brand campaigns', 'High-end brands', 'Storytelling'],
    platforms: ['instagram'],
    sceneGuide:
      'Carefully chosen real-world environment: architectural interior, minimal outdoor, gallery. Depth and narrative without overwhelming. Refined, composed posture.',
    lightingGuide:
      'Cinematic yet realistic: directional key light creating soft highlights and natural shadows that sculpt the subject. Premium tonal quality.',
    cameraGuide:
      '50-85mm portrait lens, shallow depth of field, refined composition, premium fashion editorial framing.',
    avoid: ['casual feel', 'smartphone aesthetic', 'cluttered backgrounds', 'flat lighting'],
  },
  {
    id: 'EDITORIAL_FASHION',
    name: 'Fashion Editorial',
    description: 'Runway-inspired, strong styling, high fashion',
    category: 'editorial',
    icon: 'Shirt',
    whenToUse: ['Fashion launches', 'Lookbook', 'Designer brands'],
    platforms: ['instagram'],
    sceneGuide:
      'Studio or minimal architectural setting. Strong styling, fashion-forward pose, confident attitude. Product is the star of the composition.',
    lightingGuide:
      'Controlled studio lighting: key light from 45 degrees, rim light for separation, beauty dish or large softbox. Sharp detail on fabric and accessories.',
    cameraGuide:
      '85-100mm telephoto, full body or three-quarter, fashion editorial framing, tack sharp on subject.',
    avoid: ['casual/candid', 'smartphone look', 'natural/UGC feel'],
  },
  {
    id: 'EDITORIAL_BEAUTY',
    name: 'Beauty Close-up',
    description: 'Skin-first, beauty lighting, product application',
    category: 'editorial',
    icon: 'Heart',
    whenToUse: ['Beauty brands', 'Skincare', 'Makeup', 'Close-up product'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Tight close-up: face or detail shot. Product in application or held near face. Dewy skin, natural pores visible, minimal makeup. Clean backdrop.',
    lightingGuide:
      'High-key soft studio lighting, warm off-white background, shallow depth of field on skin and product texture. Beauty dish or ring light.',
    cameraGuide:
      '85mm macro-portrait, f/2.8, focus on cheek/eye area and product, creamy background bokeh.',
    avoid: ['full body', 'busy environment', 'harsh shadows', 'over-smoothed skin'],
  },
  {
    id: 'EDITORIAL_STREET',
    name: 'Street Editorial',
    description: 'Urban edge, candid editorial, fashion-forward',
    category: 'editorial',
    icon: 'MapPin',
    whenToUse: ['Streetwear', 'Urban brands', 'Youth editorial'],
    platforms: ['instagram'],
    sceneGuide:
      'Urban street: graffiti wall, concrete, metal textures, city grit. Subject with attitude, leaning or walking. Raw, not polished.',
    lightingGuide:
      'Natural harsh daylight with strong shadows, or overcast diffused. Film grain and slight desaturation for edge. No studio look.',
    cameraGuide:
      '35mm wide or 50mm standard, street photography framing, slight tilt, film grain, analog feel.',
    avoid: ['studio', 'perfect lighting', 'clean backgrounds', 'posed perfection'],
  },

  // ─── Commercial ───
  {
    id: 'PRODUCT_LIFESTYLE',
    name: 'Product Lifestyle',
    description: 'Product in a natural real-world setting',
    category: 'commercial',
    icon: 'ShoppingBag',
    whenToUse: ['D2C brands', 'Catalog ads', 'Product clarity matters'],
    platforms: ['instagram', 'google'],
    sceneGuide:
      'Simple modern lifestyle setting: minimal room, neutral interior, table surface. Product is primary focus; model secondary if present.',
    lightingGuide:
      'Soft studio or diffused natural light, even distribution, no harsh shadows. Subtle shadows beneath product for grounding.',
    cameraGuide:
      '50mm standard lens, clean framing, product centred, professional ecommerce clarity.',
    avoid: ['cluttered', 'dramatic lighting', 'artistic distortion', 'heavy stylisation'],
  },
  {
    id: 'STUDIO_POSTER',
    name: 'Studio Poster',
    description: 'Clean studio, text-friendly, campaign-ready',
    category: 'commercial',
    icon: 'Image',
    whenToUse: ['Sales', 'Announcements', 'Brand drops', 'Banner ads'],
    platforms: ['instagram', 'facebook', 'google'],
    sceneGuide:
      'Solid or soft gradient studio backdrop, no texture or distractions. Space for text overlay. Subject centred for impact.',
    lightingGuide:
      'Controlled softbox studio lighting, even illumination, gentle shadows, strong clarity on subject and product.',
    cameraGuide:
      '50mm straight-on, symmetrical, poster-style framing, deep depth of field.',
    avoid: ['busy backgrounds', 'environmental context', 'candid feel', 'dramatic angles'],
  },
  {
    id: 'PRODUCT_HERO',
    name: 'Product Hero',
    description: 'Floating product, premium beauty/luxury shot',
    category: 'commercial',
    icon: 'Star',
    whenToUse: ['Product launches', 'Beauty/luxury ads', 'Hero shots'],
    platforms: ['instagram', 'facebook', 'google'],
    sceneGuide:
      'Product floating or prominently placed, surrounded by abstract shapes, glossy spheres, or gradient background. No model; product is the hero. Premium, futuristic.',
    lightingGuide:
      'High-contrast cinematic studio lighting, crisp reflections, shiny surfaces. 3D-render quality, 8K detail.',
    cameraGuide:
      'Macro or medium, shallow depth of field, sharp focus on product, bokeh on background elements.',
    avoid: ['model/person', 'casual setting', 'flat lighting', 'low resolution feel'],
  },

  // ─── Creative ───
  {
    id: 'CREATIVE_SURREAL',
    name: 'Surreal Conceptual',
    description: 'One uncanny element in a realistic scene',
    category: 'creative',
    icon: 'Wand2',
    whenToUse: ['Brand storytelling', 'Campaign hero', 'Art direction'],
    platforms: ['instagram'],
    sceneGuide:
      'Realistic photo with ONE surreal twist: melting fabric, floating objects, impossible landscape. Subject is unaffected, calm. Subtle strangeness, not chaotic.',
    lightingGuide:
      'Soft natural or studio light matching the realistic base. Surreal element lit consistently with the scene.',
    cameraGuide:
      '35-50mm, clean composition, shallow depth of field. The surreal element is central.',
    avoid: ['multiple surreal elements', 'fantasy', 'horror', 'digital glitch', 'chaos'],
  },
  {
    id: 'CREATIVE_CINEMATIC',
    name: 'Cinematic Motion',
    description: 'Dynamic action, motion blur, dramatic angles',
    category: 'creative',
    icon: 'Film',
    whenToUse: ['Sports', 'Athletic brands', 'Energy/action'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Dynamic action: running, jumping, kicking, dancing. Motion blur on limbs or background. Dramatic panning or low angle. Energy and movement.',
    lightingGuide:
      'Natural dramatic light or stadium/urban light. Motion blur streaks. Muted or high-contrast tones, 35mm film grain.',
    cameraGuide:
      '24-35mm wide angle, low perspective, panning shot feel, 1/30-1/60 shutter for motion blur.',
    avoid: ['static pose', 'studio setting', 'clean/still composition'],
  },
  {
    id: 'CREATIVE_TEXT_DYNAMIC',
    name: 'Text-based Dynamic',
    description: 'Model + product + bold typography + gradient',
    category: 'creative',
    icon: 'Type',
    whenToUse: ['Campaign launches', 'Nike/Adidas style', 'Bold branding'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Model in dramatic pose against fluorescent gradient background with flowing neon organic shapes. Bold sans-serif brand typography integrated with composition.',
    lightingGuide:
      'Studio key light from above-front, gradient background glowing, neon shapes reflecting on subject. High-fashion commercial light.',
    cameraGuide:
      'Full body, slightly low angle, subject fills frame with typography around them.',
    avoid: ['natural backgrounds', 'muted colours', 'candid feel', 'small text'],
  },
  {
    id: 'CREATIVE_BOLD_COLOR',
    name: 'Bold Color Studio',
    description: 'Strong colour contrast, retro-modern editorial',
    category: 'creative',
    icon: 'Palette',
    whenToUse: ['Fashion brands', 'Colour-led campaigns', 'Statement pieces'],
    platforms: ['instagram'],
    sceneGuide:
      'Solid deep colour backdrop (red, blue, emerald). Subject in contrasting outfit. Strong graphic colour blocking. Retro-modern aesthetic.',
    lightingGuide:
      'Directional studio lighting, soft but defined shadows, cinematic colour grading. Saturated, intentional palette.',
    cameraGuide:
      '50-85mm, three-quarter or full body, magazine editorial framing, sharp focus.',
    avoid: ['neutral tones', 'natural backgrounds', 'low saturation', 'casual/candid'],
  },

  // ─── Standalone Product ───
  {
    id: 'STANDALONE_CLEAN',
    name: 'Clean Product Shot',
    description: 'Studio product-only, e-commerce ready',
    category: 'standalone',
    icon: 'Box',
    whenToUse: ['Catalog', 'E-commerce', 'Product page'],
    platforms: ['instagram', 'google'],
    sceneGuide:
      'Neutral grey or white studio background, product centred, even lighting, no distractions. Professional product photography.',
    lightingGuide:
      'Even studio light from multiple angles, no harsh shadows, clean highlights on product surface.',
    cameraGuide:
      '50mm macro, straight-on or slight angle, deep depth of field, high resolution 4K.',
    avoid: ['models', 'environments', 'artistic styling', 'coloured backgrounds'],
  },
  {
    id: 'STANDALONE_SURREAL',
    name: 'Surreal Product Scene',
    description: 'Product in dreamlike, installation-art setting',
    category: 'standalone',
    icon: 'CloudLightning',
    whenToUse: ['Product launches', 'Premium positioning', 'Social buzz'],
    platforms: ['instagram'],
    sceneGuide:
      'Product floating or placed in surreal scene: stone beads, ribbons, gradient sky, water, abstract landscape. Installation art feel, wide angle, poster-worthy.',
    lightingGuide:
      'Warm cinematic light, gradient background, soft ambient fill. Product surface sharply lit with clean highlights.',
    cameraGuide:
      'Wide angle for drama, product in foreground sharp, surreal elements in mid/background, shallow DoF.',
    avoid: ['models', 'text', 'busy/cluttered', 'low-quality render'],
  },

  // ─── Indian Fashion ───
  {
    id: 'INDIAN_FESTIVE',
    name: 'Festive Vertical',
    description: '9:16 celebratory, lehenga/saree, text overlay ready',
    category: 'indian',
    icon: 'PartyPopper',
    whenToUse: ['Festive campaigns', 'Wedding brands', 'Ethnic wear'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      '9:16 vertical. Model in ethnic Indian wear (lehenga, saree, sharara) in joyful motion: twirl, dupatta wings, laughter. Soft textured wall (lilac, pink, terracotta). Fabric movement fills lower frame.',
    lightingGuide:
      'Natural window light from side creating warm glow, or golden-hour outdoor. Rose gold/warm highlights, dewy skin, fresh makeup.',
    cameraGuide:
      '1/250-1/500 to freeze fabric motion, 50mm portrait, model centred, fabric creates visual interest.',
    avoid: ['dark moody', 'western styling', 'heavy retouching', 'studio backdrop'],
  },
  {
    id: 'INDIAN_ETHNIC',
    name: 'Ethnic Elegance',
    description: 'Elegant Indian wear, heritage backdrop, editorial',
    category: 'indian',
    icon: 'Crown',
    whenToUse: ['Luxury Indian brands', 'Heritage campaigns', 'Bridal'],
    platforms: ['instagram'],
    sceneGuide:
      'Heritage architectural backdrop: haveli, palace corridor, carved stone. Model in traditional Indian outfit with jewelry. Composed, elegant pose. Rich textures and depth.',
    lightingGuide:
      'Golden hour side light on sandstone/marble, warm ambient fill. Subject lit by same directional light. Consistent warm colour temperature.',
    cameraGuide:
      '85mm portrait, three-quarter body, heritage architecture as framing element, shallow depth of field.',
    avoid: ['modern urban', 'casual styling', 'flat lighting', 'busy crowds'],
  },
]

// ═══════════════════════════════════════════════════════════════
// PRESET CATEGORIES
// ═══════════════════════════════════════════════════════════════

export const AD_PRESET_CATEGORIES: {
  id: AdPresetCategory
  label: string
  icon: string
}[] = [
  { id: 'ugc', label: 'UGC', icon: 'Camera' },
  { id: 'editorial', label: 'Editorial', icon: 'BookOpen' },
  { id: 'commercial', label: 'Commercial', icon: 'ShoppingBag' },
  { id: 'creative', label: 'Creative', icon: 'Wand2' },
  { id: 'standalone', label: 'Standalone', icon: 'Box' },
  { id: 'indian', label: 'Indian Fashion', icon: 'Crown' },
]

export function getPresetsByCategory(category: AdPresetCategory): AdPreset[] {
  return AD_PRESETS.filter((p) => p.category === category)
}

// ═══════════════════════════════════════════════════════════════
// LEGACY PROMPT TEMPLATES (fallback if GPT-4o times out)
// ═══════════════════════════════════════════════════════════════

const SAFETY_SUFFIX = `
No surreal elements (unless preset requires it), no fantasy effects, no glitch art, no collage, no duplicated features, no floating objects (unless preset requires it), no exaggerated anatomy, no body distortion, no extra unplanned text, no unplanned logos, no watermarks, no unrealistic lighting (unless preset requires it), no painterly or illustrated style (unless preset requires it). Photorealistic commercial photography unless preset explicitly specifies otherwise.`

/**
 * Build a basic fallback prompt from preset + input (no GPT).
 * Used when GPT-4o prompt builder times out.
 */
export function buildFallbackPrompt(input: AdGenerationInput): string {
  const preset = AD_PRESETS.find((p) => p.id === input.preset)
  if (!preset) throw new Error(`Unknown preset: ${input.preset}`)

  const character = resolveCharacterDescription(input)
  const textOverlay = resolveTextOverlay(input.textOverlay)

  return [
    `${preset.sceneGuide}`,
    character ? `Character: ${character}` : '',
    `Lighting: ${preset.lightingGuide}`,
    `Camera: ${preset.cameraGuide}`,
    textOverlay,
    `Avoid: ${preset.avoid.join(', ')}.`,
    SAFETY_SUFFIX,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function resolveCharacterDescription(input: AdGenerationInput): string {
  const ct = input.characterType || (input.subject?.gender ? (input.subject.gender === 'male' ? 'human_male' : 'human_female') : 'none')

  if (ct === 'none') return ''
  if (ct === 'animal') {
    return `A photorealistic ${input.animalType || 'animal'} wearing the featured product. ${input.characterStyle ? `Style: ${input.characterStyle}.` : ''}`
  }

  const gender = ct === 'human_male' ? 'man' : 'woman'
  const age = input.characterAge || input.subject?.ageRange || '22-30'
  const style = input.characterStyle || 'natural, confident'
  const pose = input.subject?.pose || 'relaxed, natural'
  const expression = input.subject?.expression || 'confident'

  return `A young ${gender} (${age}), ${style} style, ${pose} pose, ${expression} expression. Body proportions and facial features are realistic and anatomically correct.`
}

function resolveTextOverlay(overlay?: TextOverlayConfig): string {
  if (!overlay) return ''
  const parts: string[] = []
  if (overlay.headline) parts.push(`Main text: "${overlay.headline}"`)
  if (overlay.subline) parts.push(`Secondary text: "${overlay.subline}"`)
  if (overlay.tagline) parts.push(`Tagline: "${overlay.tagline}"`)
  if (overlay.placement) parts.push(`Text placement: ${overlay.placement} of the image`)
  if (overlay.fontStyle) parts.push(`Font style: ${overlay.fontStyle}`)
  return parts.length > 0 ? `TEXT OVERLAY: ${parts.join('. ')}.` : ''
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getAdPreset(id: AdPresetId): AdPreset | undefined {
  return AD_PRESETS.find((p) => p.id === id)
}

export function getAdPresetList(): AdPreset[] {
  return AD_PRESETS
}

export function validateAdInput(
  input: AdGenerationInput
): { valid: boolean; error?: string } {
  if (!AD_PRESETS.find((p) => p.id === input.preset)) {
    return { valid: false, error: 'Invalid preset selected' }
  }

  if (input.textOverlay?.headline) {
    const wordCount = input.textOverlay.headline.trim().split(/\s+/).length
    if (wordCount > 12) {
      return { valid: false, error: 'Headline cannot exceed 12 words' }
    }
  }

  if (!input.platforms || input.platforms.length === 0) {
    return { valid: false, error: 'At least one platform must be selected' }
  }

  const validCtas: CtaType[] = ['shop_now', 'learn_more', 'explore', 'buy_now']
  if (!validCtas.includes(input.ctaType)) {
    return { valid: false, error: 'Invalid CTA type' }
  }

  if (input.characterType === 'animal' && !input.animalType) {
    return { valid: false, error: 'Please select an animal type' }
  }

  return { valid: true }
}

// ═══════════════════════════════════════════════════════════════
// CTA, TONE, PLATFORM, CHARACTER DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════

export const CTA_OPTIONS: { value: CtaType; label: string }[] = [
  { value: 'shop_now', label: 'Shop Now' },
  { value: 'learn_more', label: 'Learn More' },
  { value: 'explore', label: 'Explore' },
  { value: 'buy_now', label: 'Buy Now' },
]

export const TONE_OPTIONS: { value: CaptionTone; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'premium', label: 'Premium' },
  { value: 'confident', label: 'Confident' },
]

export const PLATFORM_OPTIONS: {
  value: Platform
  label: string
  icon: string
}[] = [
  { value: 'instagram', label: 'Instagram', icon: 'Instagram' },
  { value: 'facebook', label: 'Facebook', icon: 'Facebook' },
  { value: 'google', label: 'Google Ads', icon: 'Globe' },
  { value: 'influencer', label: 'Influencer', icon: 'Users' },
]

export const CHARACTER_OPTIONS: {
  value: CharacterType
  label: string
  icon: string
}[] = [
  { value: 'human_female', label: 'Woman', icon: 'User' },
  { value: 'human_male', label: 'Man', icon: 'User' },
  { value: 'animal', label: 'Animal', icon: 'Cat' },
  { value: 'none', label: 'No Character', icon: 'Ban' },
]

export const ANIMAL_OPTIONS: string[] = [
  'Polar Bear',
  'Cat',
  'Dog',
  'Fox',
  'Owl',
  'Rabbit',
  'Raccoon',
  'Lion',
  'Tiger',
  'Monkey',
]

export const CHARACTER_STYLE_OPTIONS: string[] = [
  'Gen Z Casual',
  'High Fashion',
  'Athletic / Sporty',
  'Streetwear',
  'Elegant / Refined',
  'Bohemian',
  'Minimalist',
  'Bold / Statement',
]

export const FONT_STYLE_OPTIONS: { value: FontStyle; label: string }[] = [
  { value: 'serif', label: 'Serif (Classic)' },
  { value: 'sans-serif', label: 'Sans-serif (Modern)' },
  { value: 'handwritten', label: 'Handwritten' },
  { value: 'bold-display', label: 'Bold Display' },
]

export const TEXT_PLACEMENT_OPTIONS: { value: TextPlacement; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'center', label: 'Center' },
]
