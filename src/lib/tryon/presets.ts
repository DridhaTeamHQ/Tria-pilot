import type { TryOnStylePreset, TryOnPresetCategory } from './types'

/**
 * INDIAN-FOCUSED PRESETS
 * 
 * Features:
 * 1. Indian locations and aesthetics
 * 2. Sharp backgrounds (anti-blur)
 * 3. Natural Indian lighting
 */
export const TRYON_PRESETS_V3: TryOnStylePreset[] = [
  // =========================
  // KEEP ORIGINAL - Safest option
  // =========================
  {
    id: 'keep_original',
    name: 'Keep Original',
    description: 'Only change clothes, keep everything else.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'same lighting',
    background_name: 'keep the original background unchanged',
    style_pack: 'candid_iphone',
    background_focus: 'sharper_bg',
  },

  // =========================
  // STUDIO
  // =========================
  {
    id: 'studio_white',
    name: 'White Studio',
    description: 'Clean white professional backdrop.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'soft studio lighting',
    background_name: 'professional Indian photography studio with white backdrop',
    style_pack: 'editorial_ig',
    background_focus: 'sharper_bg',
  },
  {
    id: 'studio_grey',
    name: 'Grey Studio',
    description: 'Neutral grey professional backdrop.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'soft studio lighting',
    background_name: 'professional photography studio with grey backdrop',
    style_pack: 'editorial_ig',
    background_focus: 'sharper_bg',
  },

  // =========================
  // OUTDOOR - INDIAN
  // =========================
  {
    id: 'outdoor_natural',
    name: 'Garden',
    description: 'Indian garden with tropical plants.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'bright natural daylight',
    background_name: 'lush Indian garden with bougainvillea and tropical plants',
    style_pack: 'candid_iphone',
    background_focus: 'sharper_bg',
  },
  {
    id: 'outdoor_golden',
    name: 'Golden Hour',
    description: 'Warm sunset on rooftop/terrace.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'warm golden hour sunlight',
    background_name: 'Indian rooftop or terrace during golden hour',
    style_pack: 'travel_journal',
    background_focus: 'sharper_bg',
  },
  {
    id: 'outdoor_beach',
    name: 'Beach',
    description: 'Goa/Kerala beach scene.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'bright coastal sunlight',
    background_name: 'beautiful Indian beach like Goa with ocean and sand',
    style_pack: 'travel_journal',
    background_focus: 'sharper_bg',
  },

  // =========================
  // URBAN / STREET - INDIAN
  // =========================
  {
    id: 'street_city',
    name: 'City Street',
    description: 'Vibrant Indian city street.',
    category: 'street',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'natural daylight',
    background_name: 'colorful Indian city street with shops and buildings',
    style_pack: 'candid_iphone',
    background_focus: 'sharper_bg',
  },
  {
    id: 'street_cafe',
    name: 'Café',
    description: 'Indian café or chai stall.',
    category: 'street',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'soft café lighting',
    background_name: 'charming Indian café with wooden furniture and warm décor',
    style_pack: 'candid_iphone',
    background_focus: 'sharper_bg',
  },

  // =========================
  // LIFESTYLE - INDIAN
  // =========================
  {
    id: 'lifestyle_home',
    name: 'Home Interior',
    description: 'Modern Indian apartment.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'soft window light',
    background_name: 'modern Indian home interior with natural light',
    style_pack: 'candid_iphone',
    background_focus: 'sharper_bg',
  },
  {
    id: 'lifestyle_office',
    name: 'Office',
    description: 'Modern Indian corporate office.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'bright office lighting',
    background_name: 'modern Indian corporate office space',
    style_pack: 'editorial_ig',
    background_focus: 'sharper_bg',
  },

  // =========================
  // EDITORIAL
  // =========================
  {
    id: 'editorial_minimal',
    name: 'Editorial',
    description: 'High-fashion Indian editorial.',
    category: 'editorial',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'same pose',
    lighting_name: 'dramatic fashion lighting',
    background_name: 'minimalist Indian studio with clean architectural backdrop',
    style_pack: 'editorial_ig',
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
