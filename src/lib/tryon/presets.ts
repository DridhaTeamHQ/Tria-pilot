import { ALL_PRESETS, type ScenePreset } from './presets/index'
import type { TryOnStylePreset, TryOnPresetCategory, InstagramStylePack } from './types'

/**
 * UI PRESETS BRIDGE
 * 
 * dynamically maps the new Situation-Based Presets (presets/index.ts)
 * to the UI-compatible TryOnStylePreset format.
 */

// Helper to map string style to enum (fallback to candid_iphone)
function mapStyleToPack(style: string): InstagramStylePack {
  if (style.includes('vogue') || style.includes('editorial')) return 'editorial_vogue'
  if (style.includes('travel') || style.includes('vacation')) return 'travel_vacation'
  if (style.includes('street')) return 'documentary_street'
  if (style.includes('home')) return 'candid_home'
  if (style.includes('professional')) return 'linkedin_professional'
  return 'candid_iphone'
}

// Convert ScenePreset to TryOnStylePreset
function convertToUiPreset(p: ScenePreset): TryOnStylePreset {
  return {
    id: p.id,
    name: p.label,
    // Use the first sentence of the scene as description
    description: p.scene.split(',')[0] + '.',
    category: p.category as TryOnPresetCategory,
    pose_mode: 'locked',
    identity_lock: 'high',
    pose_name: '', // Handled by Pose Guard now
    lighting_name: p.lighting,
    background_name: p.scene,
    style_pack: mapStyleToPack(p.style),
    background_focus: 'sharper_bg'
  }
}

// Generate the V3 list from the Master Source
export const TRYON_PRESETS_V3: TryOnStylePreset[] = ALL_PRESETS.map(convertToUiPreset)

export function getTryOnPresetV3(id: string): TryOnStylePreset | undefined {
  return TRYON_PRESETS_V3.find((p) => p.id === id)
}

export function getTryOnPresetCategoriesV3(): TryOnPresetCategory[] {
  // Return unique categories from the dataset
  const categories = new Set(TRYON_PRESETS_V3.map(p => p.category))
  return Array.from(categories)
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

