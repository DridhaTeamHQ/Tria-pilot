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
  'UGC_FLAT_LAY',
  'UGC_GRWM',
  // Editorial
  'EDITORIAL_PREMIUM',
  'EDITORIAL_FASHION',
  'EDITORIAL_BEAUTY',
  'EDITORIAL_STREET',
  'EDITORIAL_FILM_NOIR',
  'EDITORIAL_ETHEREAL',
  // Commercial
  'PRODUCT_LIFESTYLE',
  'STUDIO_POSTER',
  'PRODUCT_HERO',
  'COMMERCIAL_CAROUSEL',
  'COMMERCIAL_FLAT_POSTER',
  // Creative
  'CREATIVE_SURREAL',
  'CREATIVE_CINEMATIC',
  'CREATIVE_TEXT_DYNAMIC',
  'CREATIVE_BOLD_COLOR',
  'CREATIVE_NEON_GRADIENT',
  'CREATIVE_RETRO_FILM',
  'CREATIVE_3D_RENDER',
  'CREATIVE_VAPORWAVE',
  'CREATIVE_DOUBLE_EXPOSURE',
  'CREATIVE_GLASSMORPHISM',
  'CREATIVE_WES_ANDERSON',
  'CREATIVE_DECONSTRUCTED',
  // Standalone Product
  'STANDALONE_CLEAN',
  'STANDALONE_SURREAL',
  'STANDALONE_LUXURY_MACRO',
  'STANDALONE_LEVITATION',
  // Performance / Conversion
  'PERF_MINIMAL_CLEAN',
  'PERF_SPLIT_COMPARE',
  'PERF_OOH_BILLBOARD',
  'PERF_SOCIAL_PROOF',
  // Sports / Athletic
  'SPORTS_DYNAMIC',
  'SPORTS_MONOCHROME',
  'SPORTS_TUNNEL_HERO',
  // Indian Fashion
  'INDIAN_FESTIVE',
  'INDIAN_ETHNIC',
  'INDIAN_STREET_FUSION',
] as const

export type AdPresetId = (typeof AD_PRESET_IDS)[number]

export type AdPresetCategory =
  | 'ugc'
  | 'editorial'
  | 'commercial'
  | 'creative'
  | 'standalone'
  | 'performance'
  | 'sports'
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

export type AspectRatio = '1:1' | '9:16' | '16:9' | '4:5'

/** Camera angle for ad composition — down, side, low, high, etc. */
export type CameraAngle =
  | 'auto'
  | 'eye-level'
  | 'low'
  | 'high'
  | 'down'
  | 'side'
  | 'three-quarter'
  | 'dutch'

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

  // Aspect ratio
  aspectRatio?: AspectRatio

  // Camera angle (down, side, low, high, etc.) for pro composition
  cameraAngle?: CameraAngle

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
      'Director brief: Real urban environment — sidewalk, café terrace, or lived-in room with concrete, brick, or warm wood. Authentic textures; nothing staged or sterile. Capture a spontaneous moment: mid-laugh, mid-step, or candid glance. Feels like a frame pulled from a documentary or a friend’s best iPhone shot, but lit and composed like a brand campaign.',
    lightingGuide:
      'Production-quality natural light: soft directional window light or overcast daylight as key (45° to subject), minimal fill so shadows stay soft but shape the face. Skin texture and fabric weave visible — no plastic smoothing. Subtle rim from a practical (window, open door) to separate subject from background. Colour temperature warm (5500K daylight or 4500K overcast).',
    cameraGuide:
      '35mm equivalent, f/2–2.8, slightly off-center framing, shallow depth of field with creamy bokeh behind. Eye-level or just above. Feels like premium smartphone or mirrorless — sharp where it matters, natural falloff.',
    avoid: ['studio lighting', 'perfect symmetry', 'professional posing', 'dramatic shadows', 'flat on-camera flash'],
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
      'Director brief: Intimate, direct-to-camera moment. Subject in personal space — bedroom, bathroom mirror, vanity, or cozy corner. Eye contact with lens; feels like they’re talking to one person. Product in hand or on display. Set dressing minimal but real: rumpled linen, plant, soft fabric. 9:16 vertical hero.',
    lightingGuide:
      'Single dominant source: soft window light from frame left/right (large, diffused) or warm ring-light style catchlights in eyes. Skin dewy, natural; no harsh nose shadow. Fill from environment (white wall, mirror) to keep 2:1 or softer ratio. Warm colour temp 4000–5000K. Production-quality “natural” — flattering but believable.',
    cameraGuide:
      '26mm wide (phone front-cam feel), arm’s length, slight Dutch tilt or headroom for Stories. 9:16 vertical. Shallow DoF so background melts; subject tack-sharp. Subtle lens character okay (soft corners) for authenticity.',
    avoid: ['studio backdrop', 'professional equipment visible', 'perfect symmetry', 'cold clinical light'],
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
      'Director brief: Freeze a moment of motion or attitude — mid-stride, mid-dance, hair or fabric in motion. Urban street, rooftop, or bold colour-block backdrop. Energy and youth; one strong gesture or look. Product visible and part of the action. Feels like the best frame from a Reel: dynamic, thumb-stopping.',
    lightingGuide:
      'Dramatic but natural: golden hour rim from behind, or neon/ambient urban glow (magenta/cyan) from one side. Key light sculpts face and product; fill keeps shadows from going black. Slight motion blur or wind in fabric acceptable. High saturation, punchy contrast. Think music-video meets campaign.',
    cameraGuide:
      '24–35mm wide, low or Dutch angle for power. f/2.8, shallow DoF. Slight barrel distortion for energy. 9:16 or 1:1. Frozen motion where needed; sharp on subject, background can streak or bokeh.',
    avoid: ['static pose', 'studio setting', 'muted tones', 'flat lighting', 'slow feeling'],
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
      'Director brief: Mid-shot (chest up), subject looking straight at camera — honest, conversational. Home office, living room, or soft-focus indoor background. Product in hand or worn. Feels like a premium testimonial: authentic but beautifully lit. Trust and warmth in one frame.',
    lightingGuide:
      'Soft key from 30–45° (window or large softbox), fill at 2:1 so face has shape but no harsh shadows. Warm tone (4500–5000K). Optional subtle ring-light reflection in eyes for that “creator” feel. Skin real — pores, texture — not over-smoothed.',
    cameraGuide:
      '35–50mm at eye level, f/2.8–4, subject centered or rule-of-thirds. Shallow DoF to soften background; product and face pin-sharp. Clean, flattering, conversion-ready.',
    avoid: ['dramatic poses', 'editorial styling', 'dark moody lighting', 'cold light'],
  },

  {
    id: 'UGC_FLAT_LAY',
    name: 'Flat Lay',
    description: 'Top-down product arrangement, aesthetic grid',
    category: 'ugc',
    icon: 'Image',
    whenToUse: ['Product showcase', 'Outfit of the day', 'Unboxing', 'Gift guides'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Director brief: Perfect overhead flat lay. Surface: white marble, linen, or warm wood. Product hero central; supporting props (sunglasses, watch, coffee cup, plant, magazine) arranged with negative space and rhythm. No person — curated still life. Feels like a premium OOTD or unboxing frame: clean, aspirational, scroll-stopping.',
    lightingGuide:
      'Single soft key from one side (window or large softbox) so objects cast gentle, directional shadows for depth. No flat overhead bounce — we want shape. Bright, clean, 5500K. Subtle specular on reflective props. Production-quality “natural” flat lay.',
    cameraGuide:
      'True 90° top-down, 35–50mm, f/5.6–8 for sharpness across frame. Everything in focus. Slightly warm white balance. Composition: rule of thirds or central hero with orbiting props.',
    avoid: ['people', 'messy arrangement', 'dark lighting', 'tilted angle', 'harsh shadows', 'studio backdrop'],
  },
  {
    id: 'UGC_GRWM',
    name: 'Get Ready With Me',
    description: 'Mirror selfie, getting dressed, intimate moment',
    category: 'ugc',
    icon: 'Heart',
    whenToUse: ['Fashion brands', 'Beauty routine', 'Lifestyle content', 'Intimacy'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Director brief: Intimate GRWM moment — fixing hair, adjusting outfit, applying product, or catching reflection in mirror. Bedroom or bathroom with soft lived-in details. Product on body or in hand. Feels like a best friend’s mirror selfie but lit like a brand campaign: aspirational yet relatable.',
    lightingGuide:
      'Warm key from window or vanity (3200–4000K). Soft, flattering; no harsh nose shadow. Optional rim from mirror or second source. Skin dewy, natural texture. Golden morning or soft evening vibe.',
    cameraGuide:
      '35mm or mirror POV, slightly imperfect framing for authenticity. f/2–2.8, shallow DoF. Warm tones. Eye-level or mirror reflection. Production-quality intimate.',
    avoid: ['studio setting', 'perfect posing', 'cold light', 'editorial stiffness'],
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
      'Director brief: One frame that could open a Vogue spread. Real-world environment — architectural interior, minimal outdoor, or gallery — with depth and narrative. Refined, composed posture; every element intentional. Think Peter Lindbergh, Annie Leibovitz: storytelling in a single image.',
    lightingGuide:
      'Production-quality cinematic: key at 45° front-left or front-right, soft but directional (large softbox or window). Fill at 2:1 so face and fabric are sculpted, not flat. Optional rim for hair and shoulder separation. 5500–5600K. Skin and fabric texture visible. Premium tonal quality, 8K where it matters.',
    cameraGuide:
      '50–85mm portrait, f/2–2.8, shallow depth of field, refined composition. Rule-of-thirds or centered. Premium fashion editorial framing. Tack-sharp on subject.',
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
      'Director brief: Model as sculpture. Studio or minimal architectural set; strong styling, fashion-forward pose, confident attitude. Product is the star — fabric, silhouette, accessory must read. One frame that could lead a lookbook or campaign. Guy Bourdin, Tim Walker energy.',
    lightingGuide:
      'Controlled studio rig: key at 45° (beauty dish or large softbox), fill to taste (2:1 or 3:1). Rim or backlight for hair and shoulder separation. Sharp detail on fabric weave and accessories. 5600K. Production fashion lighting — no flat single-source.',
    cameraGuide:
      '85–100mm telephoto, f/2.8–4, full body or three-quarter. Fashion editorial framing. Tack-sharp on subject, creamy falloff. 8K.',
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
      'Director brief: Tight beauty hero — face or detail shot. Product in application or held near face. Dewy skin, natural pores visible, minimal makeup. Clean backdrop. Every lash and highlight intentional. Magazine beauty spread quality.',
    lightingGuide:
      'Beauty dish or large softbox at 45°; fill at 2:1. Rim for hair separation. Skin luminous, texture visible but flattering. Catchlights in eyes. 5600K. High-key soft, no harsh nose shadow. Production beauty lighting.',
    cameraGuide:
      '85mm macro-portrait, f/2.8–4, focus on cheek/eye and product. Creamy background bokeh. 8K detail on skin and product.',
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
      'Director brief: Urban fashion in context — graffiti wall, concrete, metal, city grit. Subject with attitude: leaning, walking, or strong stance. Raw but lit like a campaign. One frame that could lead a street-style feature. Martin Parr meets high fashion.',
    lightingGuide:
      'Natural urban light: harsh daylight with strong directional shadows, or overcast soft key. Film grain and slight desaturation for edge. Optional neon or street lamp accent. No studio look — environment-driven shadows. Production-quality “street” lighting.',
    cameraGuide:
      '35mm wide or 50mm standard, street framing, slight tilt. Film grain, analog feel. f/2.8–4. Documentary-meets-campaign.',
    avoid: ['studio', 'perfect lighting', 'clean backgrounds', 'posed perfection'],
  },
  {
    id: 'EDITORIAL_FILM_NOIR',
    name: 'Film Noir',
    description: 'High-contrast B&W, dramatic shadows, mystery',
    category: 'editorial',
    icon: 'Film',
    whenToUse: ['Luxury', 'Fragrance', 'Dark aesthetic brands', 'Mystery campaigns'],
    platforms: ['instagram'],
    sceneGuide:
      'Director brief: Chiaroscuro hero. Subject partially in shadow; venetian blind stripes across face; smoke or fog. Urban night, rain-slicked streets, one subtle warm accent in B&W. Mysterious, seductive, dangerous elegance. One frame that could sell fragrance or luxury.',
    lightingGuide:
      'Single hard key from side or 45°, deep shadows. Rim on hair/shoulders for separation from black. Venetian blind patterns or window slashes. Strong contrast; no fill in shadow. 3200K or cool 4500K for mood. Film noir cinematography — production-grade.',
    cameraGuide:
      '50–85mm, low or Dutch angle, f/1.4–2. Shallow depth. Film grain, high-contrast B&W. Noir cinematography feel.',
    avoid: ['bright colours', 'soft/flat lighting', 'casual feel', 'outdoor daylight', 'digital clarity'],
  },
  {
    id: 'EDITORIAL_ETHEREAL',
    name: 'Ethereal Dream',
    description: 'Soft, dreamy, painterly, otherworldly glow',
    category: 'editorial',
    icon: 'Sparkles',
    whenToUse: ['Bridal', 'Perfume', 'Luxury skincare', 'Fantasy campaigns'],
    platforms: ['instagram'],
    sceneGuide:
      'Director brief: Otherworldly dreamscape. Subject in soft fog, floral elements, flowing fabric mid-air, petals or particles drifting. Soft focus except eyes. Palette: pale lavender, rose gold, pearl white, soft blue. Pre-Raphaelite meets fashion — one frame that could lead a bridal or perfume campaign.',
    lightingGuide:
      'Soft diffused backlight creating halo; lens flare acceptable. No harsh shadows. Bathed in warm golden or cool pearl light. Dreamy overexposed highlights. Fill from front so face is readable. Production-quality ethereal — not flat, still dimensional.',
    cameraGuide:
      '85–135mm, f/1.4–2, extreme shallow DoF. Soft diffusion or prism effect. Painterly, not clinical. 8K where sharp.',
    avoid: ['harsh light', 'urban settings', 'sharp digital clarity', 'dark/moody', 'gritty textures'],
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
      'Director brief: Product in use or in context — minimal room, neutral interior, table surface. Product primary; model secondary if present. One frame that sells the lifestyle. Authentic, aspirational, campaign-ready.',
    lightingGuide:
      'Soft key from 30–45° (window or large softbox), fill at 2:1. Directional but soft; subtle shadow beneath product for grounding. 5500K. Skin and product both lit to premium standard. No flat bounce.',
    cameraGuide:
      '50mm standard, f/2.8–4, clean framing, product centred. Shallow DoF optional. Professional e‑commerce clarity, 8K.',
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
      'Director brief: Solid or soft gradient studio backdrop; no texture or distractions. Space reserved for text overlay. Subject centred for maximum impact. One frame that could run as a poster or banner — iconic, clean, campaign-ready.',
    lightingGuide:
      'Controlled key at 45°, fill for even illumination, gentle shadows. Rim optional for separation. 5600K. Strong clarity on subject and product. Production studio lighting — flattering, defined.',
    cameraGuide:
      '50mm straight-on, symmetrical, poster-style framing. f/5.6–8 for deep DoF. Tack-sharp. 8K.',
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
      'Director brief: Product as sole star — floating or prominently placed amid abstract shapes, glossy spheres, or gradient. No model. Premium, futuristic. One frame that could open a global launch.',
    lightingGuide:
      'Key from front-left or front-right (45°), fill 2:1, rim for edge separation. Crisp reflections and speculars on glass/metal. 5600K. 3D-render quality, 8K detail. Production pack-shot level.',
    cameraGuide:
      'Macro or medium, f/5.6–8, sharp on product, bokeh on background. Slight tilt optional. 8K.',
    avoid: ['model/person', 'casual setting', 'flat lighting', 'low resolution feel'],
  },
  {
    id: 'COMMERCIAL_CAROUSEL',
    name: 'Carousel Card',
    description: 'Single-frame carousel card, clean product focus',
    category: 'commercial',
    icon: 'Image',
    whenToUse: ['Carousel ads', 'Multi-product showcase', 'Swipeable content'],
    platforms: ['instagram', 'facebook', 'google'],
    sceneGuide:
      'Director brief: Single hero frame for a carousel. Product centred on solid or soft gradient. Space on one side for implied next slide. Bold, graphic, swipe-worthy. Each frame complete but invites continuation. Campaign-quality clarity.',
    lightingGuide:
      'Clean key and fill, even and bright. Product colours accurate. Soft shadow beneath for grounding. 5600K. Production studio lighting.',
    cameraGuide:
      '50mm straight-on, 1:1 square, f/5.6–8, product sharp. Deep DoF. 8K.',
    avoid: ['busy backgrounds', 'multiple products per frame', 'text clutter', 'environmental context'],
  },
  {
    id: 'COMMERCIAL_FLAT_POSTER',
    name: 'Campaign Poster',
    description: 'Bold graphic poster, campaign-ready, print quality',
    category: 'commercial',
    icon: 'Type',
    whenToUse: ['Campaign launches', 'Print ads', 'Window displays', 'Brand drops'],
    platforms: ['instagram', 'facebook', 'google'],
    sceneGuide:
      'Director brief: Bold graphic campaign poster. Subject or product as hero; strong graphic elements — colour blocks, geometric shapes, striking negative space. Print-quality composition. Zara/H&M seasonal poster energy. One frame that stops scroll and works in-store.',
    lightingGuide:
      'Controlled studio: high-key for bright campaigns (soft key + fill, 5600K), or low-key for luxury (single key, rim, deep shadows). Sharp, defined, intentional. Production-grade.',
    cameraGuide:
      '50–85mm, clean composition, centred or rule-of-thirds. Poster-style framing. f/4–5.6. 8K.',
    avoid: ['casual/candid', 'environmental context', 'low contrast', 'busy clutter'],
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
      'Director brief: Photorealistic scene with ONE surreal twist — melting fabric, floating objects, impossible landscape. Subject calm, unaffected. Subtle strangeness; one frame that could lead a campaign. Not chaotic — controlled, iconic.',
    lightingGuide:
      'Production lighting matching the realistic base: key at 45°, fill 2:1, rim for separation. Surreal element lit consistently with scene (same shadows, same colour temp). No “CG” mismatch. 5600K or environment-appropriate.',
    cameraGuide:
      '35–50mm, f/2.8–4, clean composition, shallow DoF. Surreal element central. 8K where sharp.',
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
      'Director brief: Peak action frozen or streaked — running, jumping, kicking, dancing. Motion blur on limbs or background. Dramatic low angle or panning feel. One frame that could open a Nike or sports campaign. Energy and power.',
    lightingGuide:
      'Dramatic key from 45° or back rim; stadium or urban practicals. Motion blur streaks lit by same sources. Warm-cool contrast (orange rim, blue fill) or golden hour. 35mm film grain. Production cinematic.',
    cameraGuide:
      '24–35mm wide, low perspective. 1/30–1/60 shutter feel for motion blur, or 1/500 freeze. f/2.8. Panning shot energy.',
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
      'Director brief: Model in dramatic pose against fluorescent gradient with flowing neon organic shapes. Bold sans-serif typography integrated into composition. Full body, hero moment. One frame that could lead a global drop. Nike/Adidas campaign energy.',
    lightingGuide:
      'Studio key from above-front (45°), gradient background glowing; neon shapes casting colour on subject. Rim for separation. High-fashion commercial light — sculpted, not flat. 5600K on skin, gradient drives palette.',
    cameraGuide:
      'Full body, slightly low angle, f/4–5.6. Subject and typography both sharp. 8K. Poster-ready.',
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
      'Director brief: Solid deep backdrop (crimson #8B0000, electric blue, emerald). Subject in contrasting outfit. Strong graphic colour blocking. Retro-modern editorial — one frame that could be a magazine cover. Intentional, bold.',
    lightingGuide:
      'Directional key at 45°, fill 2:1, rim for separation. Soft but defined shadows. Cinematic colour grade; saturated, intentional palette. 5600K key. Production studio.',
    cameraGuide:
      '50–85mm, f/2.8–4, three-quarter or full body. Magazine editorial framing. Tack-sharp. 8K.',
    avoid: ['neutral tones', 'natural backgrounds', 'low saturation', 'casual/candid'],
  },

  // ─── Creative (new) ───
  {
    id: 'CREATIVE_NEON_GRADIENT',
    name: 'Neon Gradient',
    description: 'Fluorescent gradients, neon glow, futuristic vibes',
    category: 'creative',
    icon: 'Zap',
    whenToUse: ['Tech brands', 'Streetwear', 'Nightlife', 'Music'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Director brief: Subject against fluorescent gradient (magenta-to-cyan, orange-to-violet, electric blue-to-pink). Flowing neon organic shapes and light trails. Futuristic, Gen-Z energy. One frame that could lead a drop or festival campaign.',
    lightingGuide:
      'Neon rim from behind (magenta/cyan), soft fill from front. Gradient background glowing; neon reflections on skin and product. High contrast, saturated. 5600K fill on face, coloured sources drive palette. Production-quality neon.',
    cameraGuide:
      '35–50mm, f/2.8–4, full body or three-quarter, subject centred, slightly low angle. Shallow DoF on background shapes. 8K on subject.',
    avoid: ['natural backgrounds', 'muted tones', 'flat lighting', 'casual/candid'],
  },
  {
    id: 'CREATIVE_RETRO_FILM',
    name: 'Retro Film',
    description: '35mm analog, film grain, vintage colour grading',
    category: 'creative',
    icon: 'Film',
    whenToUse: ['Vintage brands', 'Heritage collections', 'Nostalgia campaigns'],
    platforms: ['instagram'],
    sceneGuide:
      'Director brief: Shot on analog 35mm. Visible grain, faded colours with warm amber/teal cast. Subject in natural environment — street, café, park. Candid or editorial pose with analog charm. One frame that could lead a heritage campaign.',
    lightingGuide:
      'Natural available light — overcast or golden hour. Slight overexposure for film look. Warm colour temp (4500–5000K). No clinical studio light. Directional where possible for shape. Production-quality “film” — not muddy.',
    cameraGuide:
      '35mm or 50mm prime, f/2–2.8, slight vignetting, analog colour shifts. Film grain prominent, not digital noise. 8K base with film treatment.',
    avoid: ['digital perfection', 'HDR look', 'studio lighting', 'sharp clinical edges'],
  },
  {
    id: 'CREATIVE_3D_RENDER',
    name: '3D Product Render',
    description: 'CGI quality, floating elements, Octane/Unreal aesthetic',
    category: 'creative',
    icon: 'Box',
    whenToUse: ['Product launches', 'Tech products', 'Premium positioning'],
    platforms: ['instagram', 'facebook', 'google'],
    sceneGuide:
      'Director brief: Ultra-realistic 3D CGI. Product floating mid-air with geometric shapes (spheres, cubes, torus), liquid splashes, or particles. Clean gradient or solid background. Octane / Unreal Engine 5 quality. One frame that could open a global launch.',
    lightingGuide:
      'Three-point: key from 45° above, fill from front, rim for edge separation. Speculars on product, caustics on transparent elements. 5600K. 8K detail. Production 3D lighting.',
    cameraGuide:
      'Macro to medium, sharp on product, bokeh on background. Slight tilt-shift optional. Deep DoF on product, shallow on environment.',
    avoid: ['people/models', 'natural backgrounds', 'casual feel', 'flat lighting', 'low-poly look'],
  },
  {
    id: 'CREATIVE_VAPORWAVE',
    name: 'Vaporwave Y2K',
    description: 'Retro-futuristic, neon pink/cyan, glitch, VHS nostalgia',
    category: 'creative',
    icon: 'Zap',
    whenToUse: ['Gen-Z brands', 'Nostalgia campaigns', 'Music/nightlife', 'Streetwear'],
    platforms: ['instagram'],
    sceneGuide:
      'Director brief: Vaporwave hero frame. Purple/pink/cyan gradients, chrome statues, floating shapes, pixel palms, sunset grid. VHS scan lines, glitch, chromatic aberration. 80s–90s retro-futurism. One frame that could lead a Gen-Z campaign.',
    lightingGuide:
      'Neon pink and cyan from opposite sides; purple ambient fill. Glowing edges on subject/product. Saturated, dreamy, lo-fi warmth. Subject still lit with key/fill so face reads. Production “vaporwave” — not flat.',
    cameraGuide:
      '35–50mm, centred, VHS/CRT overlay, slight barrel distortion. Oversaturated colour. 8K base.',
    avoid: ['natural/realistic colours', 'modern clean aesthetic', 'editorial sobriety', 'monochrome'],
  },
  {
    id: 'CREATIVE_DOUBLE_EXPOSURE',
    name: 'Double Exposure',
    description: 'Two images blended, silhouette + landscape/texture',
    category: 'creative',
    icon: 'Wand2',
    whenToUse: ['Brand storytelling', 'Conceptual campaigns', 'Art direction', 'Music'],
    platforms: ['instagram'],
    sceneGuide:
      'Director brief: Double exposure — subject silhouette filled with secondary image: city skyline, forest, ocean, flowers, or abstract texture. Seamless blend; outline clearly readable. Minimal background (white or soft gradient). One frame that could lead a conceptual campaign. Narrative, emotional.',
    lightingGuide:
      'Subject backlit for strong silhouette edges. Secondary image has its own internal lighting (directional, consistent). Overall contemplative, cinematic. No harsh front light on face.',
    cameraGuide:
      '85mm portrait, strong silhouette edge, fill texture visible through subject. Clean background. 8K.',
    avoid: ['cluttered secondary image', 'unclear silhouette', 'harsh lighting on face', 'too many elements'],
  },
  {
    id: 'CREATIVE_GLASSMORPHISM',
    name: 'Glassmorphism',
    description: 'Frosted glass layers, translucent depth, Apple aesthetic',
    category: 'creative',
    icon: 'Sparkles',
    whenToUse: ['Tech brands', 'Premium/modern brands', 'UI-inspired campaigns', 'Minimalism'],
    platforms: ['instagram', 'google'],
    sceneGuide:
      'Director brief: Product or subject through frosted translucent glass layers. Soft coloured light bleeds through — aurora-like gradients. Apple “Liquid Glass” aesthetic: layered, depth-rich, premium. One frame that could lead a tech campaign.',
    lightingGuide:
      'Soft ambient through frosted glass; diffused colour washes. Subtle caustics and refractions. Bright, high-key. Pastels (lavender, mint, peach). Key on subject so they read through glass. Production-quality glass.',
    cameraGuide:
      '50mm, f/2.8–4, shallow DoF; glass at different focus distances for bokeh layers. 8K.',
    avoid: ['dark mood', 'gritty textures', 'harsh shadows', 'vintage/analog', 'cluttered'],
  },
  {
    id: 'CREATIVE_WES_ANDERSON',
    name: 'Wes Anderson',
    description: 'Symmetrical, pastel palette, whimsical, retro-quirky',
    category: 'creative',
    icon: 'Crown',
    whenToUse: ['Quirky brands', 'Hospitality', 'Candy/food', 'Lifestyle', 'Whimsical campaigns'],
    platforms: ['instagram'],
    sceneGuide:
      'Director brief: Perfect bilateral symmetry. Pastels: powder pink, mint, pale yellow, baby blue. Retro-quirky set: hotel lobby, elevator, storefront, pool. Subject centred, dead-on, deadpan expression. Every prop intentional. Grand Budapest Hotel meets fashion. One frame that could lead a whimsical campaign.',
    lightingGuide:
      'Flat, even, warm-toned; no dramatic shadows. Practicals visible (lamps, sconces). Consistent pastel colour temp. Still production-quality — even doesn’t mean muddy; subject and set read clearly.',
    cameraGuide:
      '24–35mm wide, perfectly level, dead-centre symmetrical. Deep DoF. 16:9 or 2.39:1. 8K.',
    avoid: ['asymmetry', 'dark/moody', 'desaturated', 'gritty', 'casual framing', 'handheld feel'],
  },
  {
    id: 'CREATIVE_DECONSTRUCTED',
    name: 'Deconstructed',
    description: 'Exploded product, parts floating, technical beauty',
    category: 'creative',
    icon: 'CloudLightning',
    whenToUse: ['Product launches', 'Tech/engineering brands', 'Sneaker culture', 'Craft/quality focus'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Director brief: Product exploded — components floating in mid-air: sole from upper, laces, stitching, materials layered. Dark or gradient background. Technical beauty as art. One frame that could lead a sneaker or tech launch. Engineering diagram as photograph.',
    lightingGuide:
      'Strong key from above or 45°; dark background. Each component rim-lit for separation. Speculars on materials. Clean, premium. 5600K on product. Production studio.',
    cameraGuide:
      'Macro to medium, components in 3D depth. Shallow DoF on background, sharp on primary. 8K.',
    avoid: ['assembled product', 'models', 'casual setting', 'flat lighting', 'messy arrangement'],
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
      'Director brief: Product as sole hero. Neutral grey or white studio background, centred, no distractions. One frame that could lead a product page or catalog. Professional, premium, conversion-ready.',
    lightingGuide:
      'Key from 45° front-left or -right, fill 2:1, subtle rim for edge separation. No harsh shadows; clean speculars on product surface. 5600K. Production pack-shot — even but dimensional.',
    cameraGuide:
      '50mm macro, straight-on or slight angle, f/5.6–8, deep DoF. 8K. Tack-sharp on product.',
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
      'Director brief: Product floating or placed in surreal scene — stone beads, ribbons, gradient sky, water, abstract landscape. Installation-art feel, poster-worthy. One frame that could lead a launch or social campaign.',
    lightingGuide:
      'Warm cinematic key from 30–45°; gradient background glowing. Soft ambient fill. Product sharply lit with clean highlights and rim. 5600K on product. Production-quality surreal.',
    cameraGuide:
      'Wide angle for drama, product in foreground sharp, surreal elements mid/background. Shallow DoF. 8K on product.',
    avoid: ['models', 'text', 'busy/cluttered', 'low-quality render'],
  },
  {
    id: 'STANDALONE_LUXURY_MACRO',
    name: 'Luxury Macro',
    description: 'Extreme close-up, texture-first, premium detail',
    category: 'standalone',
    icon: 'Sparkles',
    whenToUse: ['Luxury brands', 'Jewelry', 'Watches', 'Leather goods', 'Premium detail'],
    platforms: ['instagram'],
    sceneGuide:
      'Director brief: Extreme close-up — stitching, leather grain, watch dial, gem facets, fabric weave. Dark or black background. Every surface detail revealed. Hyper-real, tactile. One frame that could lead a luxury campaign.',
    lightingGuide:
      'Raking key at 30° for texture; fill opposite at ~10%. Speculars on edges. Black-on-black premium mood. 5600K. Production macro — no flat even light.',
    cameraGuide:
      '100mm macro, f/4–5.6, tack-sharp on texture zone, creamy bokeh falloff. Focus-stacking feel. 8K.',
    avoid: ['wide shots', 'models', 'busy backgrounds', 'flat even lighting', 'digital noise'],
  },
  {
    id: 'STANDALONE_LEVITATION',
    name: 'Levitation',
    description: 'Product suspended mid-air, anti-gravity, dynamic freeze',
    category: 'standalone',
    icon: 'Wand2',
    whenToUse: ['Sneaker drops', 'Tech launches', 'Energy/dynamic brands'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Director brief: Product suspended mid-air, no support, slightly tilted. Dynamic elements frozen: water splashes, dust, paint, fabric tendrils, or light trails. Dark to gradient background. Anti-gravity, high-energy. One frame that could lead a drop campaign.',
    lightingGuide:
      'Rim from behind for glowing edges; front fill for product detail. Dynamic elements lit by same rig (motion blur or freeze). High contrast. 5600K on product. Production studio.',
    cameraGuide:
      '50–85mm, product centred, frozen motion in frame. Dark background, shallow DoF on far elements. 8K.',
    avoid: ['models', 'text', 'grounded product', 'static feel', 'low resolution'],
  },

  // ─── Performance / Conversion ───
  {
    id: 'PERF_MINIMAL_CLEAN',
    name: 'Minimal Clean',
    description: 'White space, minimal design, conversion-focused',
    category: 'performance',
    icon: 'Box',
    whenToUse: ['Performance ads', 'Google Ads', 'D2C', 'E-commerce conversion'],
    platforms: ['instagram', 'facebook', 'google'],
    sceneGuide:
      'Director brief: Ultra-clean conversion hero. Product centred on white or very light neutral. Abundant white space; optional one accent colour. No distractions. One frame that could run as a performance hero — product speaks for itself. Flat lay or floating.',
    lightingGuide:
      'High-key, diffused key and fill; minimal shadow. Even illumination, no colour cast. Subtle shadow beneath product for grounding. 5600K. Apple-product-page quality. Production minimal.',
    cameraGuide:
      'Straight-on or slight overhead, f/5.6–8, deep DoF. Product pin-sharp. 8K. Clinical precision.',
    avoid: ['busy backgrounds', 'models', 'dramatic lighting', 'heavy styling', 'text clutter'],
  },
  {
    id: 'PERF_SPLIT_COMPARE',
    name: 'Split Compare',
    description: 'Before/after or A/B split-screen comparison',
    category: 'performance',
    icon: 'Image',
    whenToUse: ['Before/after ads', 'Product comparison', 'Results-driven', 'Beauty/skincare'],
    platforms: ['instagram', 'facebook', 'google'],
    sceneGuide:
      'Director brief: Split-screen vertical. Left: “before” (dull, plain, unenhanced). Right: “after” (vibrant, premium, product-enhanced). Clean divide or gradient blend. Same subject both sides. One frame that could run as a results ad. Lighting tells the story.',
    lightingGuide:
      'Left: flat, slightly desaturated, overcast feel. Right: warm, directional key at 45°, glowing, enhanced. Same colour science so comparison is fair. Production-quality consistency.',
    cameraGuide:
      'Same angle both sides. 50mm, medium shot, consistent framing. 8K.',
    avoid: ['cluttered', 'too many elements', 'different subjects each side', 'unclear division'],
  },
  {
    id: 'PERF_OOH_BILLBOARD',
    name: 'OOH Billboard',
    description: 'Out-of-home mockup, billboard in environment',
    category: 'performance',
    icon: 'MapPin',
    whenToUse: ['Brand awareness', 'OOH campaigns', 'Pitch decks', 'Placement mockups'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Director brief: Large billboard in real urban environment — subway, building wall, bus shelter, Times Square. Billboard shows the ad creative (product + model + text). Commuters or city life in soft-focus. The billboard is the hero. One frame that could pitch OOH placement.',
    lightingGuide:
      'Billboard well-lit (backlit or spotlit). Environment: daylight, street lamps, or neon. Slight contrast so billboard reads. Production-quality environment lighting.',
    cameraGuide:
      '24–35mm wide, street perspective, billboard framed prominently. Slight Dutch or straight-on. 8K.',
    avoid: ['blank billboard', 'empty environment', 'poor quality mockup', 'cartoon/illustrated'],
  },
  {
    id: 'PERF_SOCIAL_PROOF',
    name: 'Social Proof',
    description: 'Product in-use, real results, trust-building',
    category: 'performance',
    icon: 'Users',
    whenToUse: ['Review-driven ads', 'Testimonial content', 'Results ads', 'Trust building'],
    platforms: ['instagram', 'facebook', 'google'],
    sceneGuide:
      'Director brief: Subject using or wearing product in natural setting — kitchen, living room, office, park. Genuinely happy or satisfied. Feels like a real customer photo but beautifully lit. One frame that could run as a trust-building ad. Authentic, relatable.',
    lightingGuide:
      'Soft key from window or golden hour (30–45°), fill 2:1. Warm, inviting. No studio feel — authentic but flattering. 4500–5000K. Production “natural”.',
    cameraGuide:
      '35–50mm, natural framing, subject and product both clear. f/2.8–4, slight shallow DoF. 8K.',
    avoid: ['studio perfection', 'editorial styling', 'dramatic lighting', 'fantasy/surreal'],
  },

  // ─── Sports / Athletic ───
  {
    id: 'SPORTS_DYNAMIC',
    name: 'Sports Action',
    description: 'Dynamic athletic motion, frozen moment, stadium energy',
    category: 'sports',
    icon: 'Zap',
    whenToUse: ['Athletic brands', 'Sportswear', 'Energy drinks', 'Fitness'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Director brief: Peak motion frozen — mid-jump, mid-kick, sprinting, landing. Urban or stadium. Dramatic angle capturing power and speed. Product (shoe, apparel) clearly visible. One frame that could lead a Nike or athletic campaign. Explosive energy.',
    lightingGuide:
      'Rim from behind for separation; strong key from 45°. Motion trails or particles lit by same sources. Warm-cool contrast (orange rim, blue fill). Stadium floods or golden hour. 5600K on subject. Production sports lighting.',
    cameraGuide:
      '24–35mm wide, low perspective (ground level up). 1/2000 freeze, f/2.8. Subject fills frame. 8K.',
    avoid: ['static pose', 'studio setting', 'muted tones', 'gentle/soft mood'],
  },
  {
    id: 'SPORTS_MONOCHROME',
    name: 'Sports Monochrome',
    description: 'Black & white + one accent colour, powerful simplicity',
    category: 'sports',
    icon: 'Star',
    whenToUse: ['Motivational', 'Hero athlete ads', 'Brand campaigns', 'Nike/Under Armour style'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Director brief: B&W athlete in powerful pose or motion. ONE accent colour: product (shoe, jersey) or brand element in vivid colour. Strong graphic composition, athlete fills frame. One frame that could lead a hero campaign. Inspirational, timeless.',
    lightingGuide:
      'Strong key from above or 45° sculpting musculature. Rim for separation. Deep blacks, bright highlights, no muddy midtones. B&W with accent colour in post. Production studio.',
    cameraGuide:
      '50–85mm, three-quarter or full body, slightly low angle. Sharp on subject. Dark or gradient background. 8K.',
    avoid: ['colour (except accent)', 'soft/gentle mood', 'busy backgrounds', 'casual feel'],
  },
  {
    id: 'SPORTS_TUNNEL_HERO',
    name: 'Tunnel Hero',
    description: 'Stadium tunnel walk-out, epic silhouette, god rays',
    category: 'sports',
    icon: 'Film',
    whenToUse: ['Athlete campaigns', 'Kit launches', 'Motivational', 'Sports brands'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Director brief: Athlete emerging from dark tunnel into blinding pitch/arena light. Back or three-quarter. Volumetric god rays and mist from tunnel exit. Silhouette with rim-lit edges. Kit details visible. Epic hero moment — calm before battle. One frame that could lead a kit launch.',
    lightingGuide:
      'Extreme contrast: dark tunnel behind, blinding white/warm ahead. Volumetric fog catching rays. Rim on shoulders and head. Wet concrete reflecting coloured lights. Teal-orange cinematic grade. Production cinematic.',
    cameraGuide:
      '24mm wide, low from behind, leading lines to bright exit. Shallow DoF on background light. 8K.',
    avoid: ['flat lighting', 'front-facing', 'casual setting', 'indoor studio', 'no environment'],
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
      'Director brief: 9:16 vertical hero. Model in ethnic Indian wear (lehenga, saree, sharara) in joyful motion — twirl, dupatta wings, laughter. Soft textured wall (lilac, pink, terracotta). Fabric movement fills lower frame. One frame that could lead a festive or wedding campaign.',
    lightingGuide:
      'Soft key from side (window or golden hour), warm glow. Rose gold/warm highlights, dewy skin, fresh makeup. Fill 2:1. 4000–5000K. Production-quality festive — flattering, celebratory.',
    cameraGuide:
      '1/250–1/500 to freeze fabric motion, 50mm portrait, model centred. Fabric creates visual interest. 8K. 9:16.',
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
      'Director brief: Heritage backdrop — haveli, palace corridor, carved stone. Model in traditional Indian outfit with jewelry. Composed, elegant pose. Rich textures and depth. One frame that could lead a bridal or heritage campaign.',
    lightingGuide:
      'Golden hour key from side on sandstone/marble; warm ambient fill. Subject lit by same directional light. Consistent warm colour temp (4000–4500K). Rim for separation. Production editorial.',
    cameraGuide:
      '85mm portrait, three-quarter body, heritage architecture as framing. f/2.8–4, shallow DoF. 8K.',
    avoid: ['modern urban', 'casual styling', 'flat lighting', 'busy crowds'],
  },
  {
    id: 'INDIAN_STREET_FUSION',
    name: 'Indo-Street Fusion',
    description: 'Indian wear meets street style, urban x ethnic mashup',
    category: 'indian',
    icon: 'Zap',
    whenToUse: ['Youth Indian brands', 'Fusion fashion', 'Indo-western', 'Street culture'],
    platforms: ['instagram'],
    sceneGuide:
      'Director brief: Fusion Indo-western — kurta with sneakers, saree with denim jacket, lehenga with bomber. Urban Indian backdrop: painted Mumbai wall, Delhi metro, Jaipur pink street. Attitude-first; cultural pride meets street swagger. One frame that could lead a Gen-Z Indian campaign.',
    lightingGuide:
      'Natural harsh daylight or golden hour in Indian streets. Key from 30–45°, fill 2:1. Warm colour temp, vibrant saturation. Slight film grain for grit. Production “street” — sculpted but authentic.',
    cameraGuide:
      '35mm wide, street style, dynamic angle. f/2.8–4. Slight motion or attitude pose. Film grain, warm grade. 8K.',
    avoid: ['traditional formal pose', 'studio setting', 'muted colours', 'western-only styling'],
  },
]

// Production guard: every AD_PRESET_IDS must have a matching preset (fail fast on misconfig)
const _definedPresetIds = new Set(AD_PRESETS.map((p) => p.id))
for (const id of AD_PRESET_IDS) {
  if (!_definedPresetIds.has(id)) throw new Error(`Ad preset missing definition: ${id}`)
}

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
  { id: 'performance', label: 'Performance', icon: 'Zap' },
  { id: 'sports', label: 'Sports', icon: 'Star' },
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
/** Presets that default to "product only" but allow user character override */
const PRODUCT_ONLY_PRESET_IDS: Set<string> = new Set([
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

export function buildFallbackPrompt(input: AdGenerationInput): string {
  const preset = AD_PRESETS.find((p) => p.id === input.preset)
  if (!preset) throw new Error(`Unknown preset: ${input.preset}`)

  const character = resolveCharacterDescription(input)
  const textOverlay = resolveTextOverlay(input.textOverlay)
  const hasCharacter = !!character

  // Override scene guide when user selects character on product-only preset
  let sceneGuide = preset.sceneGuide
  let avoidTerms = [...preset.avoid]

  if (hasCharacter && PRODUCT_ONLY_PRESET_IDS.has(input.preset)) {
    sceneGuide = sceneGuide
      .replace(/No model[;,.]?\s*/gi, '')
      .replace(/product is the hero/gi, 'product is prominently featured')
    avoidTerms = avoidTerms.filter(
      (t) => !t.toLowerCase().includes('model') && !t.toLowerCase().includes('person')
    )
  }

  const hasText = !!(input.textOverlay && (input.textOverlay.headline || input.textOverlay.subline || input.textOverlay.tagline))
  const noTextInstruction = hasText ? '' : 'NO TEXT: Do NOT include any text, words, letters, numbers, brand names, slogans, or typography in the image. This is a photography-only composition with ZERO written content.'

  return [
    sceneGuide,
    character ? `Character (MUST be prominent): ${character}` : '',
    `Lighting: ${preset.lightingGuide}`,
    `Camera: ${preset.cameraGuide}`,
    textOverlay,
    noTextInstruction,
    `Avoid: ${avoidTerms.join(', ')}${hasText ? '' : ', text, words, letters, numbers, brand names'}.`,
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

export const ASPECT_RATIO_OPTIONS: { value: AspectRatio; label: string; icon: string }[] = [
  { value: '1:1', label: '1:1 Square', icon: 'Square' },
  { value: '9:16', label: '9:16 Story', icon: 'Smartphone' },
  { value: '16:9', label: '16:9 Wide', icon: 'Monitor' },
  { value: '4:5', label: '4:5 Post', icon: 'Image' },
]

export const TEXT_PLACEMENT_OPTIONS: { value: TextPlacement; label: string }[] = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'center', label: 'Center' },
]

/** Camera angle options for pro ad composition (down, side, low, high, etc.) */
export const CAMERA_ANGLE_OPTIONS: { value: CameraAngle; label: string }[] = [
  { value: 'auto', label: 'Auto (best for style)' },
  { value: 'down', label: 'Down angle (looking down)' },
  { value: 'high', label: 'High angle' },
  { value: 'low', label: 'Low angle (hero / dramatic)' },
  { value: 'side', label: 'Side profile' },
  { value: 'three-quarter', label: 'Three-quarter' },
  { value: 'eye-level', label: 'Eye level' },
  { value: 'dutch', label: 'Dutch / tilted' },
]
