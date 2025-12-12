/**
 * Intelligent Preset System
 * 
 * Each preset contains 100 scenario variations covering:
 * - Camera angles (eye level, low angle, high angle, dutch angle, etc.)
 * - Lighting conditions (golden hour, soft diffused, dramatic, etc.)
 * - Background variations (different environments within the theme)
 * - Subtle pose adjustments (that don't affect face consistency)
 * - Expression guidance (natural, confident, serene, etc.)
 * 
 * GPT-4o mini analyzes the input images and automatically selects
 * the best scenario from the 100 options.
 */

export interface ScenarioVariation {
  id: string
  camera: {
    angle: 'eye_level' | 'low_angle' | 'high_angle' | 'dutch_angle' | 'birds_eye' | 'worms_eye'
    lens: '24mm_wide' | '35mm_standard' | '50mm_portrait' | '85mm_telephoto' | '135mm_compression'
    framing: 'full_body' | 'three_quarter' | 'half_body' | 'bust' | 'close_up' | 'extreme_close_up'
    depth: 'shallow_f1.4' | 'medium_f2.8' | 'deep_f5.6' | 'very_deep_f11'
  }
  lighting: {
    type: 'natural' | 'studio' | 'mixed' | 'ambient'
    direction: 'front' | 'side' | 'back' | 'rim' | 'butterfly' | 'rembrandt' | 'loop'
    quality: 'soft' | 'hard' | 'diffused' | 'dramatic'
    color: 'warm_golden' | 'cool_blue' | 'neutral' | 'warm_orange' | 'pink_magenta'
    time: 'golden_hour' | 'blue_hour' | 'midday' | 'overcast' | 'night' | 'indoor'
  }
  background: string // Specific description for this scenario
  pose: {
    stance: 'standing_straight' | 'standing_relaxed' | 'slight_lean' | 'walking' | 'seated' | 'dynamic'
    arms: 'relaxed_sides' | 'one_hip' | 'crossed' | 'gesture' | 'natural_movement'
    headTilt: 'straight' | 'slight_left' | 'slight_right' | 'chin_up' | 'chin_down'
  }
  expression: 'neutral' | 'soft_smile' | 'confident' | 'serene' | 'joyful' | 'contemplative' | 'mysterious'
  mood: string // Overall atmosphere description
}

export interface IntelligentPreset {
  id: string
  name: string
  description: string
  category: 'indian' | 'street' | 'studio' | 'outdoor' | 'lifestyle' | 'editorial' | 'fantasy'
  thumbnail?: string
  
  // What types of edits this preset applies (auto-detected)
  editTypes: ('clothing_change' | 'background_change' | 'lighting_change' | 'pose_change' | 'camera_change')[]
  
  // Base prompt template
  basePrompt: string
  
  // 100 scenario variations
  scenarios: ScenarioVariation[]
}

// ============================================================================
// SCENARIO GENERATORS - Create 100 variations per preset
// ============================================================================

const CAMERA_ANGLES: ScenarioVariation['camera']['angle'][] = ['eye_level', 'low_angle', 'high_angle', 'dutch_angle', 'birds_eye', 'worms_eye']
const CAMERA_LENS: ScenarioVariation['camera']['lens'][] = ['35mm_standard', '50mm_portrait', '85mm_telephoto', '135mm_compression']
const CAMERA_FRAMING: ScenarioVariation['camera']['framing'][] = ['full_body', 'three_quarter', 'half_body', 'bust', 'close_up']
const CAMERA_DEPTH: ScenarioVariation['camera']['depth'][] = ['shallow_f1.4', 'medium_f2.8', 'deep_f5.6']

const LIGHT_TYPES: ScenarioVariation['lighting']['type'][] = ['natural', 'studio', 'mixed', 'ambient']
const LIGHT_DIRECTIONS: ScenarioVariation['lighting']['direction'][] = ['front', 'side', 'back', 'rim', 'butterfly', 'rembrandt', 'loop']
const LIGHT_QUALITY: ScenarioVariation['lighting']['quality'][] = ['soft', 'hard', 'diffused', 'dramatic']
const LIGHT_COLORS: ScenarioVariation['lighting']['color'][] = ['warm_golden', 'cool_blue', 'neutral', 'warm_orange']
const LIGHT_TIMES: ScenarioVariation['lighting']['time'][] = ['golden_hour', 'blue_hour', 'midday', 'overcast', 'indoor']

const POSES_STANCE: ScenarioVariation['pose']['stance'][] = ['standing_straight', 'standing_relaxed', 'slight_lean', 'walking']
const POSES_ARMS: ScenarioVariation['pose']['arms'][] = ['relaxed_sides', 'one_hip', 'natural_movement']
const POSES_HEAD: ScenarioVariation['pose']['headTilt'][] = ['straight', 'slight_left', 'slight_right', 'chin_up', 'chin_down']

const EXPRESSIONS: ScenarioVariation['expression'][] = ['neutral', 'soft_smile', 'confident', 'serene', 'joyful', 'contemplative']

function generateScenarios(
  backgroundVariations: string[],
  moodVariations: string[],
  count: number = 100
): ScenarioVariation[] {
  const scenarios: ScenarioVariation[] = []
  let id = 0

  for (let i = 0; i < count && id < count; i++) {
    const bgIndex = i % backgroundVariations.length
    const moodIndex = i % moodVariations.length
    
    scenarios.push({
      id: `scenario_${++id}`,
      camera: {
        angle: CAMERA_ANGLES[id % CAMERA_ANGLES.length],
        lens: CAMERA_LENS[id % CAMERA_LENS.length],
        framing: CAMERA_FRAMING[id % CAMERA_FRAMING.length],
        depth: CAMERA_DEPTH[id % CAMERA_DEPTH.length],
      },
      lighting: {
        type: LIGHT_TYPES[id % LIGHT_TYPES.length],
        direction: LIGHT_DIRECTIONS[id % LIGHT_DIRECTIONS.length],
        quality: LIGHT_QUALITY[id % LIGHT_QUALITY.length],
        color: LIGHT_COLORS[id % LIGHT_COLORS.length],
        time: LIGHT_TIMES[id % LIGHT_TIMES.length],
      },
      background: backgroundVariations[bgIndex],
      pose: {
        stance: POSES_STANCE[id % POSES_STANCE.length],
        arms: POSES_ARMS[id % POSES_ARMS.length],
        headTilt: POSES_HEAD[id % POSES_HEAD.length],
      },
      expression: EXPRESSIONS[id % EXPRESSIONS.length],
      mood: moodVariations[moodIndex],
    })
  }

  return scenarios
}

function generateStudioScenarios(
  backgroundVariations: string[],
  moodVariations: string[],
  count: number = 100
): ScenarioVariation[] {
  const scenarios: ScenarioVariation[] = []
  let id = 0

  const STUDIO_CAMERA_ANGLES: ScenarioVariation['camera']['angle'][] = ['eye_level', 'low_angle', 'high_angle']
  const STUDIO_CAMERA_LENS: ScenarioVariation['camera']['lens'][] = ['50mm_portrait', '85mm_telephoto']
  const STUDIO_CAMERA_FRAMING: ScenarioVariation['camera']['framing'][] = ['three_quarter', 'half_body', 'bust']
  const STUDIO_CAMERA_DEPTH: ScenarioVariation['camera']['depth'][] = ['medium_f2.8', 'deep_f5.6']

  const STUDIO_LIGHT_TYPES: ScenarioVariation['lighting']['type'][] = ['studio']
  const STUDIO_LIGHT_DIRECTIONS: ScenarioVariation['lighting']['direction'][] = ['front', 'butterfly', 'rembrandt', 'loop', 'side']
  const STUDIO_LIGHT_QUALITY: ScenarioVariation['lighting']['quality'][] = ['soft', 'diffused']
  const STUDIO_LIGHT_COLORS: ScenarioVariation['lighting']['color'][] = ['neutral', 'warm_orange']
  const STUDIO_LIGHT_TIMES: ScenarioVariation['lighting']['time'][] = ['indoor']

  const STUDIO_POSES_STANCE: ScenarioVariation['pose']['stance'][] = ['standing_straight', 'standing_relaxed']
  const STUDIO_POSES_ARMS: ScenarioVariation['pose']['arms'][] = ['relaxed_sides', 'one_hip']
  const STUDIO_POSES_HEAD: ScenarioVariation['pose']['headTilt'][] = ['straight', 'slight_left', 'slight_right']

  for (let i = 0; i < count && id < count; i++) {
    const bgIndex = i % backgroundVariations.length
    const moodIndex = i % moodVariations.length

    scenarios.push({
      id: `scenario_${++id}`,
      camera: {
        angle: STUDIO_CAMERA_ANGLES[id % STUDIO_CAMERA_ANGLES.length],
        lens: STUDIO_CAMERA_LENS[id % STUDIO_CAMERA_LENS.length],
        framing: STUDIO_CAMERA_FRAMING[id % STUDIO_CAMERA_FRAMING.length],
        depth: STUDIO_CAMERA_DEPTH[id % STUDIO_CAMERA_DEPTH.length],
      },
      lighting: {
        type: STUDIO_LIGHT_TYPES[0],
        direction: STUDIO_LIGHT_DIRECTIONS[id % STUDIO_LIGHT_DIRECTIONS.length],
        quality: STUDIO_LIGHT_QUALITY[id % STUDIO_LIGHT_QUALITY.length],
        color: STUDIO_LIGHT_COLORS[id % STUDIO_LIGHT_COLORS.length],
        time: STUDIO_LIGHT_TIMES[0],
      },
      background: backgroundVariations[bgIndex],
      pose: {
        stance: STUDIO_POSES_STANCE[id % STUDIO_POSES_STANCE.length],
        arms: STUDIO_POSES_ARMS[id % STUDIO_POSES_ARMS.length],
        headTilt: STUDIO_POSES_HEAD[id % STUDIO_POSES_HEAD.length],
      },
      expression: EXPRESSIONS[id % EXPRESSIONS.length],
      mood: moodVariations[moodIndex],
    })
  }

  return scenarios
}

// ============================================================================
// PRESET DEFINITIONS
// ============================================================================

export const intelligentPresets: IntelligentPreset[] = [
  // ==========================================
  // INDIAN TRADITIONAL
  // ==========================================
  {
    id: 'jaipur_palace',
    name: 'Jaipur Palace',
    description: 'Elegant heritage palace settings with warm golden light and regal atmosphere',
    category: 'indian',
    editTypes: ['clothing_change', 'background_change', 'lighting_change'],
    basePrompt: 'Place the person in an elegant Jaipur palace setting. Heritage architecture with intricate carvings.',
    scenarios: generateScenarios(
      [
        'Ornate palace courtyard with carved stone pillars and warm terracotta walls',
        'Grand haveli entrance with brass-studded wooden doors',
        'Palace corridor with arched windows and intricate jharokha',
        'Royal chamber with painted murals and golden accents',
        'Palace terrace overlooking manicured Mughal gardens',
        'Interior hall with chandeliers and mirror work',
        'Stone balcony with carved railings and potted plants',
        'Palace gateway with elephant statues and brass lamps',
        'Courtyard fountain with geometric tile work',
        'Royal pavilion with cushioned seating and silk drapes',
      ],
      [
        'Warm, regal, timeless elegance',
        'Soft golden warmth with heritage charm',
        'Majestic afternoon light filtering through arches',
        'Romantic dusk with palace lights beginning to glow',
        'Serene morning with fresh light on stone walls',
      ],
      100
    ),
  },
  
  {
    id: 'south_temple',
    name: 'South Indian Temple',
    description: 'Dravidian temple architecture with dramatic carved gopuram and spiritual atmosphere',
    category: 'indian',
    editTypes: ['clothing_change', 'background_change', 'lighting_change'],
    basePrompt: 'Place the person at a South Indian temple. Dravidian architecture with towering gopuram.',
    scenarios: generateScenarios(
      [
        'Temple courtyard with towering gopuram and carved pillars',
        'Mandapam with ornate stone columns and sculptural details',
        'Temple corridor with oil lamps and devotional atmosphere',
        'Stone steps leading to sanctum with brass bells',
        'Prakaram path around the main shrine',
        'Temple tank with stone steps and reflections',
        'Pillared hall with shafts of light through stone screens',
        'Nandi mandapam with sacred bull sculpture',
        'Temple entrance with carved wooden doors',
        'Sacred tree courtyard with stone platform',
      ],
      [
        'Spiritual, majestic, ancient grandeur',
        'Soft morning light with temple bells',
        'Golden lamp light at dusk',
        'Peaceful midday with dappled shadows',
        'Sacred atmosphere with incense haze',
      ],
      100
    ),
  },

  {
    id: 'rajasthani_haveli',
    name: 'Rajasthani Haveli',
    description: 'Traditional haveli with vibrant blue walls, carved windows, and cultural richness',
    category: 'indian',
    editTypes: ['clothing_change', 'background_change', 'lighting_change'],
    basePrompt: 'Place the person in a traditional Rajasthani haveli. Vibrant colors and intricate architecture.',
    scenarios: generateScenarios(
      [
        'Blue-walled courtyard with carved wooden jharokha windows',
        'Haveli entrance with brass-studded doors and lanterns',
        'Interior room with colorful glass windows and painted walls',
        'Rooftop terrace with city views and decorative railings',
        'Narrow lane between blue and yellow haveli walls',
        'Courtyard with traditional swing and potted plants',
        'Painted archway with geometric patterns',
        'Interior with mirror work and cushioned seating',
        'Stone staircase with carved balustrade',
        'Haveli balcony with brass pots and textiles',
      ],
      [
        'Vibrant, cultural, warm hospitality',
        'Rich afternoon light on colored walls',
        'Soft shadows through carved screens',
        'Golden evening with brass lamp glow',
        'Fresh morning with crisp shadows',
      ],
      100
    ),
  },

  // ==========================================
  // URBAN STREET
  // ==========================================
  {
    id: 'city_street',
    name: 'Urban Street Style',
    description: 'Modern city streets with authentic urban energy and candid photography feel',
    category: 'street',
    editTypes: ['clothing_change', 'background_change', 'lighting_change'],
    basePrompt: 'Place the person on a vibrant city street. Urban energy with authentic street life.',
    scenarios: generateScenarios(
      [
        'Busy shopping street with colorful storefronts',
        'Quiet side lane with graffiti art and parked scooters',
        'Modern business district with glass buildings',
        'Historic district with colonial architecture',
        'Street market with fabric stalls and vendors',
        'Cafe-lined boulevard with outdoor seating',
        'Pedestrian crossing with urban backdrop',
        'Street corner with vintage signage',
        'Narrow market lane with hanging textiles',
        'Modern mall exterior with reflective surfaces',
      ],
      [
        'Urban, candid, energetic street vibe',
        'Overcast soft light for even tones',
        'Golden hour with long shadows',
        'Night city with neon reflections',
        'Midday urban with high contrast',
      ],
      100
    ),
  },

  {
    id: 'cafe_terrace',
    name: 'Café Terrace',
    description: 'Cozy outdoor café with warm inviting atmosphere and lifestyle feel',
    category: 'street',
    editTypes: ['clothing_change', 'background_change', 'lighting_change'],
    basePrompt: 'Place the person at a cozy outdoor café terrace. Warm and inviting atmosphere.',
    scenarios: generateScenarios(
      [
        'European-style café with wicker chairs and potted plants',
        'Rooftop café with city skyline view',
        'Garden café with string lights and greenery',
        'Corner café with vintage decor and chalkboard menu',
        'Modern café with minimalist design',
        'Traditional tea house with wooden furniture',
        'Bookshop café with shelves and reading nooks',
        'Art café with gallery walls and creative decor',
        'Seaside café with ocean views',
        'Courtyard café with fountain and flowers',
      ],
      [
        'Cozy, relaxed, lifestyle warmth',
        'Soft afternoon light through awning',
        'Warm evening with string light glow',
        'Fresh morning coffee atmosphere',
        'Dappled sunlight through trees',
      ],
      100
    ),
  },

  // ==========================================
  // STUDIO
  // ==========================================
  {
    id: 'clean_studio',
    name: 'Professional Studio',
    description: 'Clean studio setups with professional lighting for e-commerce and editorial',
    category: 'studio',
    editTypes: ['clothing_change', 'lighting_change', 'camera_change'],
    basePrompt: 'Place the person in a professional photography studio. Clean, controlled lighting.',
    scenarios: generateStudioScenarios(
      [
        'Seamless white backdrop with three-point lighting',
        'Light grey gradient background with soft shadows',
        'Warm beige cyclorama with directional key light',
        'Dark charcoal backdrop with dramatic rim lighting',
        'Pastel pink background with beauty lighting',
        'Cool grey seamless with high-key setup',
        'Cream backdrop with natural window light simulation',
        'Black background with single spotlight',
        'Soft gradient from white to grey',
        'Colored gel backdrop with creative lighting',
      ],
      [
        'Professional, clean, editorial quality',
        'Soft diffused light for flattering portraits',
        'Dramatic side lighting for depth',
        'High-key bright and airy',
        'Low-key moody and sophisticated',
      ],
      100
    ),
  },

  // ==========================================
  // OUTDOOR NATURAL
  // ==========================================
  {
    id: 'golden_field',
    name: 'Golden Fields',
    description: 'Dreamy golden hour in open fields and natural landscapes',
    category: 'outdoor',
    editTypes: ['clothing_change', 'background_change', 'lighting_change'],
    basePrompt: 'Place the person in a golden sunlit field. Dreamy, romantic natural setting.',
    scenarios: generateScenarios(
      [
        'Golden wheat field at sunset with warm backlighting',
        'Wildflower meadow with soft bokeh',
        'Rolling hills with golden grass',
        'Lavender field with purple haze',
        'Sunflower field with bright yellows',
        'Open prairie with dramatic sky',
        'Autumn field with golden leaves',
        'Spring meadow with fresh greens',
        'Coastal grassland with ocean mist',
        'Mountain meadow with distant peaks',
      ],
      [
        'Romantic, dreamy, golden warmth',
        'Soft backlighting with lens flare',
        'Golden hour magic with long shadows',
        'Ethereal morning mist',
        'Warm sunset glow on skin',
      ],
      100
    ),
  },

  {
    id: 'beach_sunset',
    name: 'Beach at Sunset',
    description: 'Coastal sunset with warm ocean vibes and relaxed atmosphere',
    category: 'outdoor',
    editTypes: ['clothing_change', 'background_change', 'lighting_change'],
    basePrompt: 'Place the person on a beautiful beach at sunset. Warm coastal atmosphere.',
    scenarios: generateScenarios(
      [
        'Sandy beach with gentle waves and orange sky',
        'Rocky coastline with dramatic waves',
        'Tropical beach with palm trees',
        'Quiet cove with calm waters',
        'Pier or boardwalk at golden hour',
        'Beach dunes with sea grass',
        'Clifftop overlooking the ocean',
        'Tidal pools with reflected sunset',
        'Beach bonfire setting',
        'Lighthouse in the distance',
      ],
      [
        'Coastal, warm, relaxed freedom',
        'Golden orange sunset tones',
        'Soft pink and purple dusk',
        'Warm afternoon beach light',
        'Blue hour with first stars',
      ],
      100
    ),
  },

  {
    id: 'forest_path',
    name: 'Forest Path',
    description: 'Peaceful forest settings with dappled sunlight and natural serenity',
    category: 'outdoor',
    editTypes: ['clothing_change', 'background_change', 'lighting_change'],
    basePrompt: 'Place the person on a peaceful forest path. Natural, serene woodland setting.',
    scenarios: generateScenarios(
      [
        'Sunlit forest path with dappled light through canopy',
        'Misty morning woods with ethereal atmosphere',
        'Autumn forest with golden and red leaves',
        'Bamboo grove with vertical lines',
        'Pine forest with soft filtered light',
        'Tropical jungle with lush greenery',
        'Birch forest with white bark and green leaves',
        'Ancient oak forest with massive trees',
        'Forest stream with moss-covered rocks',
        'Woodland clearing with wildflowers',
      ],
      [
        'Serene, natural, peaceful escape',
        'Dappled sunlight through leaves',
        'Misty ethereal morning',
        'Warm golden forest light',
        'Cool green shade',
      ],
      100
    ),
  },

  // ==========================================
  // LIFESTYLE
  // ==========================================
  {
    id: 'home_lifestyle',
    name: 'Home Lifestyle',
    description: 'Cozy home interiors with natural window light and authentic feel',
    category: 'lifestyle',
    editTypes: ['clothing_change', 'background_change', 'lighting_change'],
    basePrompt: 'Place the person in a cozy home interior. Natural, authentic lifestyle setting.',
    scenarios: generateScenarios(
      [
        'Living room with large windows and soft furnishings',
        'Bedroom with morning light through curtains',
        'Kitchen with warm wood tones and plants',
        'Reading nook with bookshelves and armchair',
        'Sunroom with plants and natural light',
        'Modern apartment with city views',
        'Cozy cottage interior with fireplace',
        'Minimalist space with clean lines',
        'Bohemian room with textiles and art',
        'Home office with warm desk lamp',
      ],
      [
        'Cozy, authentic, warm homely',
        'Soft natural window light',
        'Warm afternoon indoor glow',
        'Morning light through sheer curtains',
        'Evening lamp-lit warmth',
      ],
      100
    ),
  },

  // ==========================================
  // EDITORIAL / FASHION
  // ==========================================
  {
    id: 'fashion_editorial',
    name: 'Fashion Editorial',
    description: 'High-fashion editorial looks with dramatic styling and magazine quality',
    category: 'editorial',
    editTypes: ['clothing_change', 'background_change', 'lighting_change', 'camera_change'],
    basePrompt: 'Create a high-fashion editorial image. Magazine-quality dramatic styling.',
    scenarios: generateScenarios(
      [
        'Minimalist studio with geometric shapes',
        'Urban rooftop with city skyline',
        'Industrial warehouse with raw textures',
        'Art gallery with white walls',
        'Architectural location with strong lines',
        'Luxury hotel lobby with marble',
        'Empty theater with velvet seats',
        'Modern museum with installations',
        'Fashion runway setup',
        'High-end boutique interior',
      ],
      [
        'High-fashion, dramatic, magazine-worthy',
        'Strong directional editorial lighting',
        'Dramatic shadows and highlights',
        'Clean high-key fashion',
        'Moody low-key sophistication',
      ],
      100
    ),
  },

  {
    id: 'magazine_cover',
    name: 'Magazine Cover',
    description: 'Polished cover-worthy portraits with beauty lighting',
    category: 'editorial',
    editTypes: ['clothing_change', 'lighting_change', 'camera_change'],
    basePrompt: 'Create a magazine cover-worthy portrait. Polished beauty lighting.',
    scenarios: generateScenarios(
      [
        'Clean solid color background - white',
        'Clean solid color background - soft grey',
        'Clean solid color background - warm beige',
        'Clean solid color background - pastel blue',
        'Clean solid color background - blush pink',
        'Soft gradient - light to medium grey',
        'Soft gradient - warm cream tones',
        'Abstract texture backdrop',
        'Subtle pattern background',
        'Bokeh lights background',
      ],
      [
        'Polished, professional, cover-ready',
        'Beauty butterfly lighting',
        'Soft clamshell lighting',
        'Rembrandt lighting for depth',
        'High-key bright and fresh',
      ],
      100
    ),
  },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getIntelligentPreset(id: string): IntelligentPreset | undefined {
  return intelligentPresets.find(p => p.id === id)
}

export function getPresetsByCategory(category: IntelligentPreset['category']): IntelligentPreset[] {
  return intelligentPresets.filter(p => p.category === category)
}

export function getAllPresetCategories(): IntelligentPreset['category'][] {
  return ['indian', 'street', 'studio', 'outdoor', 'lifestyle', 'editorial', 'fantasy']
}

export function getPresetList(): { id: string; name: string; category: string; description: string }[] {
  return intelligentPresets.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
  }))
}

/**
 * Build a JSON-structured prompt from a preset and selected scenario
 * JSON format helps Gemini understand exactly what to preserve vs change
 */
export function buildPresetPromptFromScenario(
  preset: IntelligentPreset,
  scenario: ScenarioVariation,
  garmentDescription: string,
  personDescription: string,
  userInstruction?: string
): string {
  const editInstruction = {
    task: "virtual_try_on_with_scene",
    
    preserve: {
      face: "EXACT same face from subject image - do not generate new face",
      identity: "Same person, same facial structure, same skin tone",
      hair: "Same hair color and style",
      skin_quality: "Natural skin texture with pores and imperfections"
    },
    
    change: {
      clothing: {
        action: "Replace with garment from reference",
        details: garmentDescription,
        fit: "Natural draping, realistic shadows"
      },
      scene: {
        background: scenario.background,
        lighting: `${scenario.lighting.quality} ${scenario.lighting.type} light, ${scenario.lighting.color.replace('_', ' ')}`,
        mood: scenario.mood
      }
    },
    
    camera: {
      angle: scenario.camera.angle.replace('_', ' '),
      framing: scenario.camera.framing.replace('_', ' '),
      depth_of_field: scenario.camera.depth.replace('_', ' ')
    },
    
    critical_rules: [
      "The face MUST be the same person from the subject image",
      "Do NOT use any face from the clothing reference",
      "This is a photo EDIT, not a new generation",
      "Preserve skin texture - no smoothing or beautification"
    ],
    
    user_request: userInstruction || null
  }

  return `Edit instruction:
${JSON.stringify(editInstruction, null, 2)}

Summary: Replace the clothing on the subject with "${garmentDescription}". Set the scene to "${scenario.background}" with ${scenario.lighting.quality} lighting. Keep the EXACT same face from the subject image.`
}

