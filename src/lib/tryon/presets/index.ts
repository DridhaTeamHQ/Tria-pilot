/**
 * SCENE DATASET INDEX
 * 
 * Central export for all scene presets.
 * Combines Indian + Global presets into one searchable dataset.
 */

import { INDIAN_PRESETS, getIndianPreset, getIndianPresets, DEFAULT_INDIAN_PRESET, type ScenePreset } from './india'
import { GLOBAL_PRESETS, getGlobalPreset, getGlobalPresets, DEFAULT_GLOBAL_PRESET } from './global'
import { PHOTOSHOOT_PRESETS, getPhotoshootPreset, getPhotoshootPresetsByCategory } from './photoshoot'

// Re-export types
export type { ScenePreset }

// ═══════════════════════════════════════════════════════════════
// COMBINED DATASET
// ═══════════════════════════════════════════════════════════════

/**
 * All available scene presets (Indian + Global + Photoshoot)
 * Photoshoot presets are prioritized for cleaner, more professional outputs
 */
export const ALL_PRESETS: ScenePreset[] = [...PHOTOSHOOT_PRESETS, ...INDIAN_PRESETS, ...GLOBAL_PRESETS]

/**
 * Get any preset by ID (searches all regions)
 */
export function getPresetById(id: string): ScenePreset | undefined {
    return ALL_PRESETS.find(p => p.id === id)
}

/**
 * Get presets by category (all regions)
 */
export function getPresetsByCategory(category: ScenePreset['category']): ScenePreset[] {
    return ALL_PRESETS.filter(p => p.category === category)
}

/**
 * Get presets by region
 */
export function getPresetsByRegion(region: 'india' | 'global'): ScenePreset[] {
    return ALL_PRESETS.filter(p => p.region === region)
}

/**
 * Get presets by mood
 */
export function getPresetsByMood(mood: ScenePreset['mood']): ScenePreset[] {
    return ALL_PRESETS.filter(p => p.mood === mood)
}

/**
 * Search presets by keyword in scene description
 */
export function searchPresets(keyword: string): ScenePreset[] {
    const lower = keyword.toLowerCase()
    return ALL_PRESETS.filter(p =>
        p.scene.toLowerCase().includes(lower) ||
        p.label.toLowerCase().includes(lower) ||
        p.id.toLowerCase().includes(lower)
    )
}

// ═══════════════════════════════════════════════════════════════
// DATASET SUMMARY (for GPT-4o mini selection)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a condensed dataset summary for GPT-4o mini to select from
 * This is used for prompt composition - GPT picks ONE preset ID
 */
export function getPresetSummaryForSelection(): string {
    const lines: string[] = []

    // Group by region
    lines.push('INDIAN PRESETS:')
    for (const p of INDIAN_PRESETS) {
        lines.push(`  - ${p.id}: ${p.label} (${p.category}, ${p.mood})`)
    }

    lines.push('')
    lines.push('GLOBAL PRESETS:')
    for (const p of GLOBAL_PRESETS) {
        lines.push(`  - ${p.id}: ${p.label} (${p.category}, ${p.mood})`)
    }

    return lines.join('\n')
}

/**
 * Get preset IDs only (for validation)
 */
export function getAllPresetIds(): string[] {
    return ALL_PRESETS.map(p => p.id)
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT / FALLBACK
// ═══════════════════════════════════════════════════════════════

/**
 * Default fallback preset (Indian Home Lifestyle)
 */
export const DEFAULT_PRESET = DEFAULT_INDIAN_PRESET

/**
 * Get default preset for a region
 */
export function getDefaultPreset(region: 'india' | 'global' = 'india'): ScenePreset {
    return region === 'india' ? DEFAULT_INDIAN_PRESET : DEFAULT_GLOBAL_PRESET
}

// Re-export region-specific functions
export {
    INDIAN_PRESETS,
    GLOBAL_PRESETS,
    PHOTOSHOOT_PRESETS,
    getIndianPreset,
    getIndianPresets,
    getGlobalPreset,
    getGlobalPresets,
    getPhotoshootPreset,
    getPhotoshootPresetsByCategory,
    DEFAULT_INDIAN_PRESET,
    DEFAULT_GLOBAL_PRESET
}
