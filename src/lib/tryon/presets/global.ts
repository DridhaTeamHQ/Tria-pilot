/**
 * GLOBAL PRESETS - LOCATION-FIRST, PHOTO-REAL
 * 
 * Philosophy:
 * - Location descriptions, NOT "vibes"
 * - Written like a photographer describing a real place
 * - Clean, minimal, non-stereotypical
 * - Compatible with identity lock + garment override
 * 
 * Structure per preset:
 * - location: Physical description of the place
 * - camera: Position, angle, device simulation
 * - lighting: Light source, quality, direction
 * - background: Elements visible behind subject
 * - realism: Imperfections that make it feel real
 */

import type { ScenePreset } from './india'

// ═══════════════════════════════════════════════════════════════
// ☕ CAFÉ PRESETS
// ═══════════════════════════════════════════════════════════════

export const GLOBAL_PRESETS: ScenePreset[] = [
    {
        id: 'cafe_modern_neighborhood',
        label: 'Modern Neighborhood Café',
        category: 'lifestyle',
        region: 'global',
        scene: 'Small modern café with concrete floor, light wood tables, matte ceramic cups',
        lighting: 'Soft window daylight from one side, mild shadow falloff',
        camera: 'Seated eye-level, slight diagonal angle, iPhone handheld',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No staged look, no perfect symmetry'
    },
    {
        id: 'cafe_quiet_morning',
        label: 'Quiet Morning Café',
        category: 'lifestyle',
        region: 'global',
        scene: 'Early-morning café, minimal crowd, clean glass windows, pale walls, empty chairs, barista moving in background',
        lighting: 'Cool daylight, no harsh highlights',
        camera: 'Chest-height standing shot, casual framing',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No artificial warmth'
    },
    {
        id: 'cafe_outdoor_sidewalk',
        label: 'Outdoor Sidewalk Café',
        category: 'street',
        region: 'global',
        scene: 'Street-side café with metal chairs and small round tables, parked scooters, passing pedestrians blurred, street textures visible',
        lighting: 'Natural daylight with soft overhead shade',
        camera: 'Slightly wide iPhone lens, seated perspective',
        motion: 'candid motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No bokeh beauty shot'
    },

    // ═══════════════════════════════════════════════════════════════
    // 🌿 TERRACE / BALCONY PRESETS
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'terrace_apartment_day',
        label: 'Apartment Terrace – Day',
        category: 'home',
        region: 'global',
        scene: 'Residential apartment terrace with railing, plants in clay pots, city buildings at distance, laundry lines, open sky',
        lighting: 'Bright indirect daylight',
        camera: 'Standing, waist-up framing, slight downward tilt',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No perfect landscaping'
    },
    {
        id: 'terrace_rooftop_evening',
        label: 'Rooftop Terrace – Evening',
        category: 'outdoor',
        region: 'global',
        scene: 'Open rooftop with low wall and scattered seating, urban skyline, water tanks, muted city colors',
        lighting: 'Golden-hour sunlight, warm but soft',
        camera: 'Eye-level, slightly off-center framing',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No dramatic sunset'
    },

    // ═══════════════════════════════════════════════════════════════
    // 🏙️ CLEAN STREET / URBAN
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'urban_quiet_street',
        label: 'Quiet Urban Street',
        category: 'street',
        region: 'global',
        scene: 'Low-traffic city street with neutral buildings and textured walls, parked vehicles, shuttered shops, overhead wires',
        lighting: 'Flat daylight, overcast feel',
        camera: 'Standing full-body, iPhone wide',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cinematic grading'
    },
    {
        id: 'urban_concrete_walkway',
        label: 'Minimal Concrete Walkway',
        category: 'street',
        region: 'global',
        scene: 'Modern office or apartment complex walkway, clean walls, subtle shadows, no clutter',
        lighting: 'Diffuse daylight reflecting off concrete',
        camera: 'Mid-distance, straight-on',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No styled architecture shot'
    },

    // ═══════════════════════════════════════════════════════════════
    // 🪟 INTERIOR (REAL, NOT STUDIO)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'interior_living_room',
        label: 'Window-Lit Living Room',
        category: 'home',
        region: 'global',
        scene: 'Real apartment living room with sofa, side table, curtains, books, plants, framed photos slightly misaligned',
        lighting: 'Window daylight, uneven brightness',
        camera: 'Seated perspective, slight crop',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No interior design magazine look'
    },
    {
        id: 'interior_work_desk',
        label: 'Working Desk Setup',
        category: 'office',
        region: 'global',
        scene: 'Home work desk near window, laptop, notebook, cables, coffee mug',
        lighting: 'Soft side light, no rim light',
        camera: 'Seated, waist-up, casual angle',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No LinkedIn professional shot'
    },

    // ═══════════════════════════════════════════════════════════════
    // 🧼 CLEAN AESTHETIC (MINIMAL BUT REAL)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'minimal_white_wall_porch',
        label: 'White Wall Porch',
        category: 'home',
        region: 'global',
        scene: 'Plain off-white wall near building entrance, minor wall texture, small cracks, uneven paint',
        lighting: 'Bright natural daylight',
        camera: 'Standing portrait, centered',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No studio cyclorama'
    },
    {
        id: 'minimal_staircase',
        label: 'Modern Staircase',
        category: 'home',
        region: 'global',
        scene: 'Apartment staircase with metal railing and concrete steps, repeating steps, subtle depth',
        lighting: 'Ambient daylight, neutral tone',
        camera: 'Slight upward angle',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No architectural photography'
    },

    // ═══════════════════════════════════════════════════════════════
    // 📸 PHOTO-SHOOT QUALITY (BUT IPHONE)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'photoshoot_street_corner',
        label: 'Editorial Street Corner',
        category: 'street',
        region: 'global',
        scene: 'Street corner with clean lines and strong geometry, shadows from buildings, mild contrast',
        lighting: 'Directional daylight',
        camera: 'Full-body, slight diagonal',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No fashion editorial'
    },
    {
        id: 'photoshoot_cafe_window',
        label: 'Café Window Portrait',
        category: 'lifestyle',
        region: 'global',
        scene: 'Standing near café window from inside, street outside softly blurred',
        lighting: 'Window light on one side of face',
        camera: 'Chest-up framing',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No beauty lighting'
    }
]

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

export function getGlobalPresets(): ScenePreset[] {
    return GLOBAL_PRESETS
}

export function getGlobalPreset(id: string): ScenePreset | undefined {
    return GLOBAL_PRESETS.find(p => p.id === id)
}

export function getGlobalPresetsByCategory(category: ScenePreset['category']): ScenePreset[] {
    return GLOBAL_PRESETS.filter(p => p.category === category)
}

export const DEFAULT_GLOBAL_PRESET = GLOBAL_PRESETS.find(p => p.id === 'cafe_modern_neighborhood')!

// Re-export ANTI_PORTRAIT_RULE from india.ts
export { ANTI_PORTRAIT_RULE } from './india'
