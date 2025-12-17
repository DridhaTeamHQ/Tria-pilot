import type { TryOnStylePreset, TryOnPresetCategory } from './types'

/**
 * BEST OF THE BEST PRESETS
 * Only the most reliable, tested presets that consistently produce good results.
 * Simple descriptions, no complex camera specs - let the model interpret naturally.
 */
export const TRYON_PRESETS_V3: TryOnStylePreset[] = [
  // =========================
  // STUDIO - Most reliable for product shots
  // =========================
  {
    id: 'studio_white',
    name: 'Studio White',
    description: 'Clean white background, perfect for product shots.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'keep the exact same pose',
    lighting_name: 'soft even studio lighting',
    background_name: 'plain white studio background',
    style_pack: 'editorial_ig',
    background_focus: 'sharper_bg',
  },
  {
    id: 'studio_grey',
    name: 'Studio Grey',
    description: 'Neutral grey background, professional look.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'keep the exact same pose',
    lighting_name: 'soft studio lighting with gentle shadows',
    background_name: 'neutral grey studio background',
    style_pack: 'editorial_ig',
    background_focus: 'moderate_bokeh',
  },

  // =========================
  // OUTDOOR - Natural, reliable settings
  // =========================
  {
    id: 'outdoor_natural',
    name: 'Natural Outdoor',
    description: 'Natural daylight outdoors, true colors.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'keep the exact same pose',
    lighting_name: 'natural daylight, soft shadows',
    background_name: 'outdoor setting with greenery, naturally blurred',
    style_pack: 'candid_iphone',
    background_focus: 'moderate_bokeh',
  },
  {
    id: 'outdoor_golden',
    name: 'Golden Hour',
    description: 'Warm golden sunlight, Instagram-worthy.',
    category: 'outdoor',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'keep the exact same pose',
    lighting_name: 'warm golden hour sunlight',
    background_name: 'outdoor garden or park with warm light',
    style_pack: 'travel_journal',
    background_focus: 'moderate_bokeh',
  },

  // =========================
  // STREET - Urban, candid looks
  // =========================
  {
    id: 'street_daylight',
    name: 'Street Daylight',
    description: 'Urban street in natural daylight.',
    category: 'street',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'keep the exact same pose',
    lighting_name: 'natural daylight',
    background_name: 'city street with buildings blurred in background',
    style_pack: 'candid_iphone',
    background_focus: 'moderate_bokeh',
  },
  {
    id: 'street_cafe',
    name: 'Café Scene',
    description: 'Casual café or restaurant setting.',
    category: 'street',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'keep the exact same pose',
    lighting_name: 'soft natural light',
    background_name: 'café or restaurant terrace, slightly blurred',
    style_pack: 'candid_iphone',
    background_focus: 'moderate_bokeh',
  },

  // =========================
  // LIFESTYLE - Indoor, home settings
  // =========================
  {
    id: 'lifestyle_home',
    name: 'Home Interior',
    description: 'Cozy home with window light.',
    category: 'lifestyle',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'keep the exact same pose',
    lighting_name: 'soft window light indoors',
    background_name: 'minimal home interior',
    style_pack: 'candid_iphone',
    background_focus: 'moderate_bokeh',
  },

  // =========================
  // EDITORIAL - Premium, magazine-style
  // =========================
  {
    id: 'editorial_minimal',
    name: 'Editorial Minimal',
    description: 'Clean, premium magazine look.',
    category: 'editorial',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'keep the exact same pose',
    lighting_name: 'professional studio lighting',
    background_name: 'minimal clean backdrop',
    style_pack: 'editorial_ig',
    background_focus: 'sharper_bg',
  },

  // =========================
  // KEEP ORIGINAL - Safest option
  // =========================
  {
    id: 'keep_original',
    name: 'Keep Original Background',
    description: 'Only change clothes, keep everything else.',
    category: 'studio',
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: 'keep the exact same pose',
    lighting_name: 'keep the original lighting',
    background_name: 'keep the original background exactly as is',
    style_pack: 'candid_iphone',
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
