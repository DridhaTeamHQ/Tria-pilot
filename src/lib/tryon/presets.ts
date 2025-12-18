import type { TryOnStylePreset, TryOnPresetCategory } from './types'

/**
 * HIGGSFIELD-STYLE PRESETS
 * 
 * Each preset is designed with:
 * 1. Authentic Indian locations and aesthetics
 * 2. Sharp, realistic backgrounds (anti-blur, anti-AI)
 * 3. Natural imperfections for realism
 * 4. Detailed lighting setups
 * 5. Candid/iPhone photo aesthetics where appropriate
 */
export const TRYON_PRESETS_V3: TryOnStylePreset[] = [
  // =========================
  // KEEP ORIGINAL - Safest option
  // =========================
  {
    id: 'keep_original',
    name: 'Keep Original',
    description: 'Only change clothes, preserve everything else identically.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'exact same pose and expression',
    lighting_name: 'exact same lighting as original photo',
    background_name: 'keep the original background completely unchanged',
    style_pack: 'preserve_original',
    background_focus: 'sharper_bg',
  },

  // =========================
  // STUDIO PRESETS
  // =========================
  {
    id: 'studio_white',
    name: 'White Studio',
    description: 'Professional white backdrop with soft fashion lighting.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'natural standing pose',
    lighting_name: 'three-point studio lighting with soft key, fill, and rim light',
    background_name: 'professional photography studio with white seamless paper backdrop, showing natural paper curve and subtle shadows',
    style_pack: 'editorial_vogue',
    background_focus: 'sharper_bg',
  },
  {
    id: 'studio_grey',
    name: 'Grey Studio',
    description: 'Classic grey backdrop for timeless portraits.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'natural standing pose',
    lighting_name: 'soft box lighting from camera right with gentle shadows',
    background_name: 'photography studio with grey muslin fabric backdrop showing natural fabric texture and gentle draping',
    style_pack: 'editorial_professional',
    background_focus: 'sharper_bg',
  },

  // =========================
  // OUTDOOR INDIAN PRESETS
  // =========================
  {
    id: 'outdoor_natural',
    name: 'Garden',
    description: 'Lush Indian garden with bougainvillea and tropical plants.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'relaxed natural stance',
    lighting_name: 'dappled natural sunlight filtering through leaves',
    background_name: 'lush Indian garden with overgrown bougainvillea in magenta and white, weathered stone pathway, tropical ferns, old terracotta pots',
    style_pack: 'candid_iphone',
    background_focus: 'sharper_bg',
  },
  {
    id: 'outdoor_golden',
    name: 'Golden Hour',
    description: 'Warm sunset on Indian rooftop terrace.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'relaxed golden hour pose',
    lighting_name: 'warm golden hour with sun at 15 degrees, long shadows, orange-pink sky gradient',
    background_name: 'weathered Indian rooftop terrace at sunset with potted tulsi and money plant, faded chairs, rusty railing, city silhouette',
    style_pack: 'travel_golden',
    background_focus: 'sharper_bg',
  },
  {
    id: 'outdoor_beach',
    name: 'Beach',
    description: 'Authentic Goa beach with sand and palm trees.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'relaxed beach stance',
    lighting_name: 'bright coastal sunlight with glare on water and fill from sand reflection',
    background_name: 'real Goa beach with uneven wet sand, seaweed, footprints, weathered palms with brown fronds, distant fishing boats, beach shack',
    style_pack: 'travel_vacation',
    background_focus: 'sharper_bg',
  },

  // =========================
  // URBAN/STREET INDIAN PRESETS
  // =========================
  {
    id: 'street_city',
    name: 'City Street',
    description: 'Vibrant Indian city street with colorful buildings.',
    category: 'street',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'candid street pose',
    lighting_name: 'harsh midday Indian sun with strong shadows and dust haze',
    background_name: 'vibrant Indian city street with colorful painted buildings, peeling paint, tangled wires, parked scooters, chai stall, hand-painted signs, auto-rickshaw',
    style_pack: 'documentary_street',
    background_focus: 'sharper_bg',
  },
  {
    id: 'street_cafe',
    name: 'Café',
    description: 'Cozy Indian café with warm ambient lighting.',
    category: 'street',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'seated or standing café pose',
    lighting_name: 'warm ambient bulb light mixed with cool window daylight',
    background_name: 'cozy Indian café with mismatched wooden chairs, chipped tables, plants in recycled tins, fairy lights, vintage Bollywood posters, chai menu',
    style_pack: 'candid_instagram',
    background_focus: 'sharper_bg',
  },

  // =========================
  // LIFESTYLE INDIAN PRESETS
  // =========================
  {
    id: 'lifestyle_home',
    name: 'Home Interior',
    description: 'Real Indian apartment with natural window light.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'casual home pose',
    lighting_name: 'natural window light with dust motes and warm afternoon glow',
    background_name: 'real Indian apartment with lived-in feel, sheer curtains, family photos, indoor plants, colorful cushions, everyday clutter, chai cup',
    style_pack: 'candid_home',
    background_focus: 'sharper_bg',
  },
  {
    id: 'lifestyle_office',
    name: 'Office',
    description: 'Modern Indian corporate office space.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'professional standing pose',
    lighting_name: 'overhead fluorescent mixed with window light',
    background_name: 'real Indian corporate office with papers on desk, dual monitors, water bottle, chai cup, cables, desk plant, cubicle dividers',
    style_pack: 'linkedin_professional',
    background_focus: 'sharper_bg',
  },

  // =========================
  // EDITORIAL/FASHION
  // =========================
  {
    id: 'editorial_minimal',
    name: 'Editorial',
    description: 'High-fashion minimal industrial aesthetic.',
    category: 'editorial',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'fashion editorial pose',
    lighting_name: 'dramatic harsh directional light creating deep chiaroscuro with rim light on hair',
    background_name: 'minimal industrial space with raw concrete walls showing form marks, polished floor with scuff marks, single geometric light fixture, architectural shadow play',
    style_pack: 'vogue_editorial',
    background_focus: 'sharper_bg',
  },
]

export function getTryOnPresetV3(id: string): TryOnStylePreset | undefined {
  return TRYON_PRESETS_V3.find((p) => p.id === id)
}

export function getTryOnPresetCategoriesV3(): TryOnPresetCategory[] {
  return ['studio', 'outdoor', 'street', 'lifestyle', 'editorial']
}

export function getTryOnPresetListV3(): Array<{
  id: string
  name: string
  category: TryOnPresetCategory
  description: string
}> {
  return TRYON_PRESETS_V3.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
  }))
}
