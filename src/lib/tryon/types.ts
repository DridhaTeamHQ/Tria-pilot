export type TryOnPresetCategory =
  | 'studio'
  | 'street'
  | 'outdoor'
  | 'lifestyle'
  | 'editorial'
  | 'traditional'

export type InstagramStylePack =
  | 'candid_iphone'
  | 'editorial_ig'
  | 'flash_party'
  | 'travel_journal'
  | 'surveillance_doc'

export type BackgroundFocusMode = 'moderate_bokeh' | 'sharper_bg'

export interface TryOnStylePreset {
  id: string
  name: string
  description: string
  category: TryOnPresetCategory
  pose_name: string
  lighting_name: string
  background_name: string
  style_pack: InstagramStylePack
  background_focus: BackgroundFocusMode
  /**
   * Identity stability control:
   * - normal: default behavior
   * - high: prefer stronger identity locking (use stricter render on first pass and retry on medium drift)
   */
  identity_lock?: 'normal' | 'high'
  /**
   * Whether the preset is allowed to change pose:
   * - locked: keep pose exactly (best identity consistency)
   * - subtle: allow small adjustments (head tilt, shoulder angle, arm placement). Recommend extra identity refs.
   */
  pose_mode?: 'locked' | 'subtle'
}

export interface ShootPlanV3 {
  prompt_text: string
  scene_text?: string
  camera_text?: string
  imperfection_text?: string
  negative_text?: string
  selected_recipe_id?: string
  selected_recipe_why?: string
}

export interface TryOnQualityOptions {
  quality: 'high' | 'fast'
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9'
  resolution?: '1K' | '2K' | '4K'
}

export interface VerifyResult {
  ok: boolean
  reasons: string[]
  has_extra_people: boolean
  appears_collage: boolean
  scene_plausible?: boolean
  lighting_realism?: 'high' | 'medium' | 'low'
  lighting_consistent?: boolean
  subject_color_preserved?: boolean
  looks_ai_generated?: boolean
  background_detail_preserved?: boolean
  dof_realistic?: boolean
  garment_applied: boolean
  garment_fidelity: 'high' | 'medium' | 'low'
  identity_preserved: boolean
  identity_fidelity: 'high' | 'medium' | 'low'
  original_outfit_still_present: boolean
  output_is_unedited_copy: boolean
}


