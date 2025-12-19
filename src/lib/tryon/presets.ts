import type { TryOnStylePreset, TryOnPresetCategory } from './types'

/**
 * UI PRESETS (Environment-Only)
 * 
 * CRITICAL: These presets describe ONLY environment/lighting/background.
 * NO subject language (pose, stance, expression, fashion, editorial).
 * Identity comes ONLY from Image 1.
 */
export const TRYON_PRESETS_V3: TryOnStylePreset[] = [
  // =========================
  // KEEP ORIGINAL - Safest
  // =========================
  {
    id: 'keep_original',
    name: 'Keep Original',
    description: 'Only change clothes, keep original background.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',  // No pose language
    lighting_name: 'preserve original lighting',
    background_name: 'keep original background unchanged',
    style_pack: 'preserve_original',
    background_focus: 'sharper_bg',
  },

  // =========================
  // STUDIO PRESETS
  // =========================
  {
    id: 'studio_white',
    name: 'White Studio',
    description: 'Clean white photography backdrop.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'three-point studio lighting with soft key, fill, and rim light',
    background_name: 'photography studio with white seamless paper backdrop',
    style_pack: 'editorial_vogue',
    background_focus: 'sharper_bg',
  },
  {
    id: 'studio_grey',
    name: 'Grey Studio',
    description: 'Classic grey photography backdrop.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'soft box lighting from camera right with gentle shadows',
    background_name: 'photography studio with grey muslin fabric backdrop',
    style_pack: 'editorial_professional',
    background_focus: 'sharper_bg',
  },

  // =========================
  // OUTDOOR PRESETS
  // =========================
  {
    id: 'outdoor_natural',
    name: 'Garden',
    description: 'Lush Indian garden with bougainvillea.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'dappled natural sunlight filtering through leaves',
    background_name: 'lush Indian garden with bougainvillea, weathered stone pathway, tropical ferns, terracotta pots',
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
    pose_name: '',
    lighting_name: 'warm golden hour, sun at 15 degrees, long shadows, orange-pink sky',
    background_name: 'weathered Indian rooftop terrace at sunset, potted plants, faded chairs, city silhouette',
    style_pack: 'travel_golden',
    background_focus: 'sharper_bg',
  },
  {
    id: 'outdoor_beach',
    name: 'Beach',
    description: 'Goa beach with sand and palm trees.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'bright coastal sunlight with water reflections, fill from sand',
    background_name: 'Goa beach with sand, seaweed, weathered palms, distant fishing boats, beach shack',
    style_pack: 'travel_vacation',
    background_focus: 'sharper_bg',
  },

  // =========================
  // STREET PRESETS
  // =========================
  {
    id: 'street_city',
    name: 'City Street',
    description: 'Vibrant Indian city street.',
    category: 'street',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'harsh midday Indian sun with strong shadows',
    background_name: 'vibrant Indian city street, colorful painted buildings, tangled wires, parked scooters, chai stall, auto-rickshaw',
    style_pack: 'documentary_street',
    background_focus: 'sharper_bg',
  },
  {
    id: 'street_cafe',
    name: 'Café',
    description: 'Cozy Indian café with warm lighting.',
    category: 'street',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'warm ambient bulb light mixed with cool window daylight',
    background_name: 'cozy Indian café, mismatched wooden chairs, plants in recycled tins, fairy lights, chai menu',
    style_pack: 'candid_instagram',
    background_focus: 'sharper_bg',
  },

  // =========================
  // LIFESTYLE PRESETS
  // =========================
  {
    id: 'lifestyle_home',
    name: 'Home Interior',
    description: 'Real Indian apartment with window light.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'natural window light with warm afternoon glow',
    background_name: 'real Indian apartment, sheer curtains, family photos, indoor plants, colorful cushions, everyday clutter',
    style_pack: 'candid_home',
    background_focus: 'sharper_bg',
  },
  {
    id: 'lifestyle_office',
    name: 'Office',
    description: 'Modern Indian corporate office.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'overhead fluorescent mixed with window light',
    background_name: 'Indian corporate office, papers on desk, dual monitors, water bottle, desk plant, cubicle dividers',
    style_pack: 'linkedin_professional',
    background_focus: 'sharper_bg',
  },

  // =========================
  // EDITORIAL
  // =========================
  {
    id: 'editorial_minimal',
    name: 'Editorial',
    description: 'Minimal industrial space.',
    category: 'editorial',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'dramatic harsh directional light, deep chiaroscuro with rim light',
    background_name: 'minimal industrial space, raw concrete walls, polished floor, geometric light fixture, architectural shadows',
    style_pack: 'vogue_editorial',
    background_focus: 'sharper_bg',
  },

  // =========================
  // NEW INDIAN PRESETS
  // =========================
  {
    id: 'india_chai_stall',
    name: 'Chai Stall',
    description: 'Roadside chai stall, morning atmosphere.',
    category: 'street',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'soft morning light mixed with chai steam haze',
    background_name: 'roadside chai stall, steel kettle, glass cups, wooden bench, steam rising',
    style_pack: 'candid_iphone',
    background_focus: 'sharper_bg',
  },
  {
    id: 'india_market',
    name: 'Indian Market',
    description: 'Busy market lane with natural chaos.',
    category: 'street',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'harsh midday sun with patchy shade from awnings',
    background_name: 'busy Indian market lane, vegetable stalls, hanging fabrics, shopkeepers, natural clutter',
    style_pack: 'documentary_street',
    background_focus: 'sharper_bg',
  },
  {
    id: 'india_temple',
    name: 'Temple Courtyard',
    description: 'South Indian temple with carved pillars.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'dappled afternoon light through courtyard, warm stone reflections',
    background_name: 'South Indian temple courtyard, carved stone pillars, worn granite floor, oil lamps',
    style_pack: 'travel_journal',
    background_focus: 'sharper_bg',
  },
  {
    id: 'india_hill_station',
    name: 'Hill Station',
    description: 'Misty morning in Indian hill station.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'soft overcast light with atmospheric mist',
    background_name: 'Indian hill station, colonial bungalows, pine trees, mist, winding mountain road',
    style_pack: 'travel_vacation',
    background_focus: 'sharper_bg',
  },
  {
    id: 'india_terrace_night',
    name: 'Terrace Night',
    description: 'Urban terrace with city lights.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'mixed fairy lights and cool city glow',
    background_name: 'urban terrace at night, fairy lights, plastic chairs, city lights in distance',
    style_pack: 'candid_iphone',
    background_focus: 'sharper_bg',
  },
  {
    id: 'india_kitchen',
    name: 'Indian Kitchen',
    description: 'Authentic Indian kitchen.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'mixed daylight from window plus warm tungsten bulb',
    background_name: 'modest Indian kitchen, steel utensils, pressure cooker, gas stove, spice jars',
    style_pack: 'candid_iphone',
    background_focus: 'sharper_bg',
  },
  {
    id: 'india_morning_home',
    name: 'Morning Home',
    description: 'Indian home with morning sunlight.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'strong morning directional light with warm orange tones',
    background_name: 'Indian living room or bedroom, morning sunlight through curtains, everyday items',
    style_pack: 'candid_home',
    background_focus: 'sharper_bg',
  },
  {
    id: 'india_cowork_cafe',
    name: 'Work Café',
    description: 'Modern café with laptop and coffee.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '',
    lighting_name: 'warm cafe lighting mixed with daylight from window',
    background_name: 'urban Indian cafe, exposed brick walls, coffee cup, laptop, other patrons',
    style_pack: 'candid_instagram',
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
