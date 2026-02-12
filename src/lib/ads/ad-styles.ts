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

  {
    id: 'UGC_FLAT_LAY',
    name: 'Flat Lay',
    description: 'Top-down product arrangement, aesthetic grid',
    category: 'ugc',
    icon: 'Image',
    whenToUse: ['Product showcase', 'Outfit of the day', 'Unboxing', 'Gift guides'],
    platforms: ['instagram', 'facebook'],
    sceneGuide:
      'Top-down overhead flat lay on a clean surface (white marble, linen, wood). Product arranged centrally with complementary accessories: sunglasses, watch, coffee cup, plant, notebook. Aesthetic grid composition. No person visible, just curated items.',
    lightingGuide:
      'Soft natural window light from one side, gentle shadows for depth. Even, bright, clean. No harsh shadows. Instagram-aesthetic warmth.',
    cameraGuide:
      'Directly overhead, 90-degree top-down, 35-50mm, deep depth of field, everything in focus. Slightly warm white balance.',
    avoid: ['people', 'messy arrangement', 'dark lighting', 'tilted angle', 'studio backdrop'],
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
      'Subject captured mid-getting-ready: fixing hair, adjusting outfit, applying lipstick, or looking in a mirror. Bedroom or bathroom setting with soft lived-in feel. Product visible being worn or held. Intimate, relatable, aspirational-yet-attainable moment.',
    lightingGuide:
      'Warm golden morning light through window, or soft vanity lighting. Gentle highlights on skin, natural warmth. No flash.',
    cameraGuide:
      '35mm phone-style or mirror reflection, slightly imperfect framing for authenticity, shallow depth of field, warm tones.',
    avoid: ['studio setting', 'perfect posing', 'professional lighting', 'editorial stiffness'],
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
  {
    id: 'EDITORIAL_FILM_NOIR',
    name: 'Film Noir',
    description: 'High-contrast B&W, dramatic shadows, mystery',
    category: 'editorial',
    icon: 'Film',
    whenToUse: ['Luxury', 'Fragrance', 'Dark aesthetic brands', 'Mystery campaigns'],
    platforms: ['instagram'],
    sceneGuide:
      'Dramatic film noir scene: subject partially in shadow, venetian blind light stripes across face, cigarette smoke or fog. Urban night, rain-slicked streets reflecting streetlights. Predominantly black and white with one subtle warm accent. Mysterious, seductive, dangerous elegance.',
    lightingGuide:
      'Single hard key light creating deep shadows. Chiaroscuro. Strong contrast between light and dark. Venetian blind patterns, window light slashes. Rim light on hair/shoulders for separation from black background.',
    cameraGuide:
      '50-85mm, low or Dutch angle, shallow depth of field. Film grain, high contrast black and white processing. Noir cinematography feel.',
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
      'Otherworldly dreamscape: subject floating or standing in soft fog, floral elements, flowing fabric caught mid-air, petals or particles drifting. Ethereal, painterly quality. Soft focus everywhere except eyes. Colours: pale lavender, rose gold, pearl white, soft blue. Pre-Raphaelite painting meets fashion photography.',
    lightingGuide:
      'Soft diffused backlight creating a glowing halo. Lens flare acceptable. No harsh shadows. Everything bathed in warm golden or cool pearl light. Dreamy, overexposed highlights.',
    cameraGuide:
      '85-135mm, wide open f/1.4-2.0, extreme shallow depth of field. Soft diffusion filter or prism effect. Painterly, not clinical.',
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
  {
    id: 'COMMERCIAL_CAROUSEL',
    name: 'Carousel Card',
    description: 'Single-frame carousel card, clean product focus',
    category: 'commercial',
    icon: 'Image',
    whenToUse: ['Carousel ads', 'Multi-product showcase', 'Swipeable content'],
    platforms: ['instagram', 'facebook', 'google'],
    sceneGuide:
      'Single clean frame designed for a carousel series. Product centred with solid colour or soft gradient background. Space on one side for implied next slide. Bold, graphic, swipe-worthy. Each frame feels complete but invites continuation.',
    lightingGuide:
      'Clean studio lighting, even and bright, product colours accurate. Soft shadow beneath for grounding.',
    cameraGuide:
      '50mm, straight-on, 1:1 square, deep DoF, product sharp against clean background.',
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
      'Bold graphic campaign poster. Subject or product as hero with strong graphic elements: bold colour blocks, geometric shapes, striking negative space. Print-quality composition. Feels like a Zara or H&M seasonal campaign poster.',
    lightingGuide:
      'Controlled studio lighting: high-key for bright campaigns, or dramatic low-key for luxury. Sharp, defined, intentional.',
    cameraGuide:
      '50-85mm, clean composition, subject/product centred or rule-of-thirds, poster-style framing.',
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
      'Subject against a fluorescent gradient background (magenta-to-cyan, orange-to-violet, or electric blue-to-pink). Flowing neon organic shapes and light trails surround the subject. Futuristic, Gen-Z energy, high saturation.',
    lightingGuide:
      'Neon rim lighting from behind, soft fill from front, gradient background glowing. Neon reflections on skin and product. High contrast, saturated colour.',
    cameraGuide:
      '35-50mm, full body or three-quarter, subject centred, slightly low angle for power. Shallow DoF on background shapes.',
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
      'Shot on analog 35mm film. Visible grain, slightly faded colours with warm amber/teal cast. Subject in natural environment — street, café, park bench. Candid or editorial pose with analog charm.',
    lightingGuide:
      'Natural available light, overcast or golden hour. Slight overexposure for film look. Warm colour temperature, no clinical studio light.',
    cameraGuide:
      '35mm or 50mm prime, f/2.0-2.8, slight vignetting, analog colour shifts. Film grain prominent, not digital noise.',
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
      'Ultra-realistic 3D CGI render. Product floating mid-air surrounded by geometric shapes (spheres, cubes, torus), liquid splashes, or particle effects. Clean gradient or solid colour background. Octane Render / Unreal Engine 5 quality.',
    lightingGuide:
      'Three-point studio setup: key light from 45 degrees above, fill from front, rim light for edge separation. Specular highlights on product, caustics on transparent elements. 8K resolution detail.',
    cameraGuide:
      'Macro to medium, sharp focus on product, bokeh on background elements. Slight tilt-shift for miniature effect. Deep DoF for product, shallow for environment.',
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
      'Vaporwave aesthetic: subject or product against a retro-futuristic backdrop of purple/pink/cyan gradients, chrome Greek statues, floating geometric shapes, pixelated palm trees, sunset grid horizon. VHS scan lines, glitch effects, chromatic aberration. 80s-90s retro-futurism meets internet culture.',
    lightingGuide:
      'Neon pink and cyan dual lighting from opposite sides. Purple ambient fill. Glowing edges. Saturated, dreamy, lo-fi warmth under digital haze.',
    cameraGuide:
      '35-50mm, centred composition, VHS/CRT texture overlay, slight barrel distortion, oversaturated colour.',
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
      'Double exposure effect: subject silhouette filled with a secondary image — city skyline, forest, ocean waves, flower field, or abstract texture. The two images blend seamlessly. Subject outline is clearly readable. Background is minimal (white or soft gradient). Artistic, narrative, emotional.',
    lightingGuide:
      'Subject backlit to create strong silhouette edges. Secondary image has its own internal lighting. Overall mood is contemplative and cinematic.',
    cameraGuide:
      '85mm portrait, strong silhouette edge, the fill texture visible through the subject. Clean background for contrast.',
    avoid: ['cluttered secondary image', 'unclear silhouette', 'harsh lighting on subject face', 'too many elements'],
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
      'Product or subject seen through and behind layers of frosted translucent glass panels. Soft coloured light bleeds through the glass creating aurora-like gradients. Apple "Liquid Glass" aesthetic — layered, depth-rich, premium, clean. Glass panels at different depths and angles.',
    lightingGuide:
      'Soft ambient light passing through frosted glass, creating diffused colour washes. Subtle caustics and refractions. Bright, airy, high-key. Pastel gradients (lavender, mint, peach).',
    cameraGuide:
      '50mm, shallow depth of field, glass panels at different focus distances creating natural bokeh layers.',
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
      'Perfect bilateral symmetry. Pastel colour palette (powder pink, mint green, pale yellow, baby blue). Retro-quirky interior or exterior: hotel lobby, elevator, storefront, pool. Subject centred dead-on, looking directly at camera with deadpan expression. Obsessive set dressing, every prop intentional. Grand Budapest Hotel meets fashion.',
    lightingGuide:
      'Flat, even, warm-toned lighting with no dramatic shadows. Natural or practical lights visible (lamps, sconces). Consistent pastel colour temperature throughout.',
    cameraGuide:
      'Wide-angle 24-35mm, perfectly level, dead-centre symmetrical framing, deep depth of field. Aspect ratio slightly wide (16:9 or 2.39:1 cinematic).',
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
      'Product deconstructed/exploded: all components separated and floating in mid-air showing internal structure — sole separated from upper, laces floating, stitching visible, materials layered. Dark or gradient background. Technical beauty meets art. Like a high-end engineering diagram brought to life as a photograph.',
    lightingGuide:
      'Dramatic studio lighting: strong key from above, dark background, each floating component individually lit with rim light. Specular highlights on materials. Clean, premium.',
    cameraGuide:
      'Macro to medium, components arranged in 3D space with depth, shallow DoF on background, sharp on primary component.',
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
  {
    id: 'STANDALONE_LUXURY_MACRO',
    name: 'Luxury Macro',
    description: 'Extreme close-up, texture-first, premium detail',
    category: 'standalone',
    icon: 'Sparkles',
    whenToUse: ['Luxury brands', 'Jewelry', 'Watches', 'Leather goods', 'Premium detail'],
    platforms: ['instagram'],
    sceneGuide:
      'Extreme close-up of product showing micro-texture: stitching, grain of leather, watch dial, gemstone facets, weave of fabric. Dark or black background. Product lit to reveal every surface detail. Hyper-real, tactile, sensory.',
    lightingGuide:
      'Single directional key light at 30 degrees creating raking light across texture. Fill from opposite side at 10% intensity. Specular highlights on edges. Black-on-black premium mood.',
    cameraGuide:
      '100mm macro, f/4-5.6, tack sharp on texture zone, creamy bokeh falloff. Focus stacking feel. 8K detail.',
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
      'Product suspended in mid-air with no visible support, slightly tilted. Dynamic elements frozen around it: water splashes, dust particles, paint splatters, fabric tendrils, or light trails. Dark to gradient background. Anti-gravity, high-energy, premium. The product is the sole subject.',
    lightingGuide:
      'Dramatic rim light from behind creating glowing edges. Front fill for product detail. Dynamic elements have their own motion-blur or frozen-splash lighting. High contrast.',
    cameraGuide:
      '50-85mm, product centred, frozen motion elements in mid-frame, dark background, shallow DoF on furthest elements.',
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
      'Ultra-clean minimal composition. Product centred on white or very light neutral background. Abundant white space. Optional: one accent colour pop. No distractions, no environment. The product speaks for itself. Flat lay or floating.',
    lightingGuide:
      'High-key, diffused, shadowless. Even illumination from all sides. Clean, clinical, Apple-product-page quality. No colour cast.',
    cameraGuide:
      'Straight-on or slight overhead, deep depth of field, product pin-sharp, clinical precision.',
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
      'Split-screen composition divided vertically. Left side: "before" state (dull, plain, unenhanced). Right side: "after" state (vibrant, premium, enhanced with the product). Clean dividing line or gradient blend between halves. Same subject in both halves for continuity.',
    lightingGuide:
      'Left (before): flat, slightly desaturated, overcast feel. Right (after): warm, directional, glowing, enhanced. The lighting tells the transformation story.',
    cameraGuide:
      'Same camera angle both sides for continuity. 50mm, medium shot, consistent framing.',
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
      'A large billboard or poster in a real urban environment: subway station, city building wall, bus shelter, or Times Square–style display. The billboard contains the ad creative (product + model + text). Commuters or city life in soft-focus background. The billboard is the hero.',
    lightingGuide:
      'Billboard is well-lit (backlit or spotlit). Environment has natural urban lighting: daylight, street lamps, or neon. Slight contrast between billboard brightness and surroundings.',
    cameraGuide:
      '24-35mm wide angle, street photography perspective, billboard framed prominently. Slight Dutch angle or straight-on.',
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
      'Subject using or wearing the product in a natural everyday setting, looking genuinely happy or satisfied. Authentic, relatable, not overly produced. The image should feel like a real customer photo that happens to be beautifully lit. Kitchen, living room, office, park — real environments.',
    lightingGuide:
      'Natural soft light, warm tone, inviting. Window light or outdoor golden hour. No studio feel — authentic but flattering.',
    cameraGuide:
      '35-50mm, natural framing, subject and product both clearly visible, slight shallow depth of field for professional touch while maintaining authentic feel.',
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
      'Athlete in peak motion: mid-jump, mid-kick, sprinting, landing. Frozen moment with implied explosive energy. Urban or stadium environment. Dramatic angle capturing power and speed. Product (shoe, apparel) clearly visible on the athlete.',
    lightingGuide:
      'Dramatic rim light from behind separating subject from background. Strong key light from 45 degrees. Motion trails or particle effects. Warm-cool contrast (orange rim, blue fill). Stadium flood lights or golden hour.',
    cameraGuide:
      '24-35mm wide angle, low perspective (ground level looking up), 1/2000 shutter to freeze motion, f/2.8, subject fills frame.',
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
      'Monochrome (black & white) image of athlete in powerful pose or motion. ONE accent colour element: the product (shoe, jersey) or brand element in vivid colour. Strong graphic composition, athlete fills frame. Inspirational, timeless, powerful.',
    lightingGuide:
      'High-contrast studio lighting: strong key light from above creating sculpted shadows on musculature. Rim light for separation. Deep blacks, bright highlights, no muddy midtones.',
    cameraGuide:
      '50-85mm, three-quarter or full body, slightly low angle, sharp focus on subject, dark or gradient background.',
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
      'Athlete emerging from dark stadium tunnel into blinding light of the pitch/arena. Back view or three-quarter. Volumetric god rays and atmospheric mist streaming from the tunnel exit. Silhouette with rim-lit edges. Kit/apparel details visible. Epic hero moment, the calm before battle.',
    lightingGuide:
      'Extreme contrast: dark tunnel behind, blinding white/warm light ahead. Volumetric fog/mist catching light rays. Rim light on shoulders and head. Wet concrete floor reflecting coloured lights. Teal-orange cinematic colour grade.',
    cameraGuide:
      '24mm wide angle, low perspective from behind, leading lines from tunnel walls converging to bright exit. Shallow DoF on background light.',
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
  {
    id: 'INDIAN_STREET_FUSION',
    name: 'Indo-Street Fusion',
    description: 'Indian wear meets street style, urban x ethnic mashup',
    category: 'indian',
    icon: 'Zap',
    whenToUse: ['Youth Indian brands', 'Fusion fashion', 'Indo-western', 'Street culture'],
    platforms: ['instagram'],
    sceneGuide:
      'Model in fusion Indo-western outfit: kurta with sneakers, saree draped casually with denim jacket, or lehenga with bomber jacket. Urban Indian backdrop: painted Mumbai wall, Delhi metro, Jaipur pink city street. Attitude-first, cultural pride meets street swagger. Vibrant, energetic, Gen-Z Indian.',
    lightingGuide:
      'Natural harsh daylight or golden hour in Indian streets. Warm colour temperature, vibrant saturation. Slight film grain for grit.',
    cameraGuide:
      '35mm wide angle, street photography style, dynamic angle, slight motion or attitude pose. Film grain, warm grade.',
    avoid: ['traditional formal pose', 'studio setting', 'muted colours', 'western-only styling'],
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
