/**
 * INDIAN PRESETS — TYPE DEFINITIONS
 * 
 * This file now only exports the ScenePreset interface.
 * All actual presets live in photoshoot.ts.
 * 
 * Kept for backward compatibility since many files import
 * ScenePreset from this module.
 */

export const ANTI_PORTRAIT_RULE = `ANTI-PORTRAIT RULE:
- No studio framing
- No centered headshot
- No shallow beauty depth
- No spotlight lighting
- No three-point portrait lighting
- Ambient environmental lighting only`

export interface ScenePreset {
    id: string
    label: string
    category: 'home' | 'office' | 'street' | 'outdoor' | 'travel' | 'lifestyle'
    region: 'india' | 'global'
    scene: string      // Detailed environment description
    lighting: string   // Physics-based lighting description
    camera: string     // Lens and framing specification
    motion: 'static' | 'subtle motion' | 'candid motion'
    mood: 'candid'     // Default mood
    style: 'realism'   // Default style
    negative_bias: string
}

// Re-export photoshoot presets as "Indian" presets for backward compatibility
import { PHOTOSHOOT_PRESETS } from './photoshoot'

export const INDIAN_PRESETS: ScenePreset[] = PHOTOSHOOT_PRESETS.filter(p => p.region === 'india')

export function getIndianPresets(): ScenePreset[] {
    return INDIAN_PRESETS
}

export function getIndianPreset(id: string): ScenePreset | undefined {
    return INDIAN_PRESETS.find(p => p.id === id)
}

export function getIndianPresetsByCategory(category: ScenePreset['category']): ScenePreset[] {
    return INDIAN_PRESETS.filter(p => p.category === category)
}

export const DEFAULT_INDIAN_PRESET = PHOTOSHOOT_PRESETS[0]
