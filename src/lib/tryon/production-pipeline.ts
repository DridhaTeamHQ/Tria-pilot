/**
 * PRODUCTION PIPELINE - INDIAN PHOTOSHOOT REALISM
 * 
 * 5-STAGE ARCHITECTURE:
 * 1. FACE FREEZE (absolute)
 * 2. IDENTITY LOCK (geometry)
 * 3. CLOTHING REPLACE (destructive)
 * 4. POSE LIMIT (micro only)
 * 5. SCENE + LIGHTING (real locations)
 */

import 'server-only'

// ═══════════════════════════════════════════════════════════════
// INDIAN PHOTOSHOOT LOCATIONS (NOT AI ART)
// ═══════════════════════════════════════════════════════════════

export interface ProductionPreset {
    id: string
    name: string
    location: string
    camera: string
    lighting: string
    foreground: string
    midground: string
    background: string
}

export const PRODUCTION_PRESETS: ProductionPreset[] = [
    // ═══════════════════════════════════════════════════════════
    // CAFÉ LOCATIONS
    // ═══════════════════════════════════════════════════════════
    {
        id: 'cafe_terrace',
        name: 'Café Terrace',
        location: 'Outdoor café terrace, metal tables, potted plants',
        camera: 'Eye level, seated perspective, 35mm equivalent',
        lighting: 'Soft window daylight from one side, mild shadow falloff',
        foreground: 'Table edge, coffee cup, menu card',
        midground: 'Other tables and chairs, partial view of customers',
        background: 'Street view, parked scooters, building facade'
    },
    {
        id: 'cafe_indoor_window',
        name: 'Café Indoor Window',
        location: 'Indoor café near window, exposed brick wall',
        camera: 'Chest level, iPhone handheld, 28mm',
        lighting: 'Window light from left, warm ambient bulbs',
        foreground: 'Table surface, laptop edge, coffee mug',
        midground: 'Barista counter, shelves with jars',
        background: 'Window with street activity blurred'
    },
    {
        id: 'cafe_morning',
        name: 'Morning Café',
        location: 'Quiet morning café, minimal crowd, pale walls',
        camera: 'Standing, casual framing, 35mm',
        lighting: 'Cool morning daylight, soft diffuse',
        foreground: 'Chair back, table corner',
        midground: 'Empty tables, magazine rack',
        background: 'Large windows, soft outdoor brightness'
    },

    // ═══════════════════════════════════════════════════════════
    // HERITAGE / COURTYARD
    // ═══════════════════════════════════════════════════════════
    {
        id: 'heritage_wall',
        name: 'Heritage Stone Wall',
        location: 'Sandstone wall with carved texture, old city',
        camera: 'Eye level, 50mm equivalent, slight telephoto',
        lighting: 'Golden hour from side, warm tones, long shadows',
        foreground: 'Wall texture, carved details',
        midground: 'Worn stone floor, iron railing',
        background: 'Archway, old wooden door'
    },
    {
        id: 'courtyard_plants',
        name: 'Courtyard with Plants',
        location: 'Inner courtyard, terracotta pots, worn tiles',
        camera: 'Waist level, 35mm, slight wide angle',
        lighting: 'Dappled morning light through foliage',
        foreground: 'Clay pot, creeper leaves',
        midground: 'Tiled floor, stone bench',
        background: 'Weathered wall, distant doorway'
    },
    {
        id: 'heritage_arch',
        name: 'Heritage Archway',
        location: 'Stone arch in old building, textured walls',
        camera: 'Standing, centered on arch, 35mm',
        lighting: 'Open shade under arch, bright exterior',
        foreground: 'Stone floor texture',
        midground: 'Arch frame, pillar detail',
        background: 'Bright courtyard through arch'
    },

    // ═══════════════════════════════════════════════════════════
    // MINIMAL INDOOR
    // ═══════════════════════════════════════════════════════════
    {
        id: 'minimal_white_wall',
        name: 'White Wall Indoor',
        location: 'Plain off-white wall in home, wooden floor',
        camera: 'Eye level, centered, 50mm equivalent',
        lighting: 'Large window from side, soft gradient shadow',
        foreground: 'Floor edge visible',
        midground: 'Wall with slight plaster texture',
        background: 'Wall continues, skirting board visible'
    },
    {
        id: 'minimal_staircase',
        name: 'Staircase',
        location: 'Apartment staircase, metal railing, concrete steps',
        camera: 'Slight upward angle, 28mm wide',
        lighting: 'Mixed ambient, neutral tones',
        foreground: 'Step edges, railing',
        midground: 'Repeating steps pattern',
        background: 'Upper landing, wall numbers'
    },

    // ═══════════════════════════════════════════════════════════
    // LIFESTYLE INDOOR
    // ═══════════════════════════════════════════════════════════
    {
        id: 'living_room',
        name: 'Living Room',
        location: 'Apartment living room, sofa, side table',
        camera: 'Seated perspective, 35mm, casual crop',
        lighting: 'Window light, warm afternoon glow',
        foreground: 'Cushion edge, remote control',
        midground: 'Sofa back, bookshelf',
        background: 'Curtained window, TV unit'
    },
    {
        id: 'work_desk',
        name: 'Work Desk',
        location: 'Home desk near window, laptop, notebooks',
        camera: 'Seated, waist-up, 35mm',
        lighting: 'Side light from window, no rim light',
        foreground: 'Desk surface, keyboard edge',
        midground: 'Monitor, coffee cup, cables',
        background: 'Window with curtain, plant'
    },
    {
        id: 'balcony_day',
        name: 'Balcony Daylight',
        location: 'Apartment balcony, railing, city view',
        camera: 'Standing at railing, 28mm',
        lighting: 'Bright indirect daylight, open sky',
        foreground: 'Railing, potted plant',
        midground: 'Balcony floor, drying clothes',
        background: 'City buildings, sky'
    },

    // ═══════════════════════════════════════════════════════════
    // URBAN STREET
    // ═══════════════════════════════════════════════════════════
    {
        id: 'urban_street_quiet',
        name: 'Quiet Urban Street',
        location: 'Low-traffic city street, painted walls',
        camera: 'Standing, full body, 35mm',
        lighting: 'Overcast flat daylight, soft shadows',
        foreground: 'Pavement texture, drain cover',
        midground: 'Parked scooter, shop shutter',
        background: 'Buildings, electric wires, signage'
    },
    {
        id: 'urban_walkway',
        name: 'Concrete Walkway',
        location: 'Modern apartment complex walkway',
        camera: 'Mid-distance, straight-on, 35mm',
        lighting: 'Diffuse daylight reflecting off concrete',
        foreground: 'Walkway edge',
        midground: 'Clean walls, subtle shadows',
        background: 'Building entrance, numbered door'
    }
]

// ═══════════════════════════════════════════════════════════════
// PRESET HELPERS - WITH FALLBACK TO INDIA/GLOBAL PRESETS
// ═══════════════════════════════════════════════════════════════

// Import existing presets for fallback
import { INDIAN_PRESETS, getIndianPreset, type ScenePreset as IndiaScenePreset } from './presets/india'
import { GLOBAL_PRESETS, getGlobalPreset } from './presets/global'
import { getPresetById } from './presets/index'

/**
 * Convert india/global preset to production format.
 */
function convertToProductionPreset(preset: IndiaScenePreset): ProductionPreset {
    return {
        id: preset.id,
        name: preset.label,
        location: preset.scene,
        camera: preset.camera,
        lighting: preset.lighting,
        foreground: 'Subject foreground',
        midground: 'Scene midground',
        background: 'Environment background'
    }
}

export function getProductionPreset(id: string): ProductionPreset | undefined {
    console.log(`🔍 getProductionPreset called with id: "${id}"`)

    if (!id) {
        console.log(`   ⚠️ No preset ID provided`)
        return undefined
    }

    // First try production presets (new format)
    const productionPreset = PRODUCTION_PRESETS.find(p => p.id === id)
    if (productionPreset) {
        console.log(`   ✅ Found in PRODUCTION_PRESETS: ${productionPreset.name}`)
        return productionPreset
    }
    console.log(`   ❌ Not in PRODUCTION_PRESETS (${PRODUCTION_PRESETS.length} presets)`)

    // Universal fallback: search ALL_PRESETS (india + global combined)
    const anyPreset = getPresetById(id)
    if (anyPreset) {
        console.log(`   ✅ Found in ALL_PRESETS: ${anyPreset.label}`)
        return convertToProductionPreset(anyPreset)
    }
    console.log(`   ❌ Not in ALL_PRESETS`)

    console.log(`   ⚠️ Preset "${id}" not found in any dataset!`)
    console.log(`   📋 Available production preset IDs: ${PRODUCTION_PRESETS.map(p => p.id).join(', ')}`)
    return undefined
}

export function getRandomProductionPreset(): ProductionPreset {
    return PRODUCTION_PRESETS[Math.floor(Math.random() * PRODUCTION_PRESETS.length)]
}

export function getProductionPresetsByType(type: 'cafe' | 'heritage' | 'minimal' | 'lifestyle' | 'urban'): ProductionPreset[] {
    const prefixes: Record<string, string[]> = {
        cafe: ['cafe_'],
        heritage: ['heritage_', 'courtyard_'],
        minimal: ['minimal_'],
        lifestyle: ['living_', 'work_', 'balcony_'],
        urban: ['urban_']
    }
    return PRODUCTION_PRESETS.filter(p =>
        prefixes[type]?.some(prefix => p.id.startsWith(prefix))
    )
}

// ═══════════════════════════════════════════════════════════════
// SCENE DESCRIPTION BUILDER
// ═══════════════════════════════════════════════════════════════

export function buildSceneDescription(preset: ProductionPreset): string {
    return `Location: ${preset.location}
Camera: ${preset.camera}
Lighting: ${preset.lighting}
Foreground elements: ${preset.foreground}
Midground elements: ${preset.midground}
Background elements: ${preset.background}`
}

/**
 * Build complete production prompt from preset.
 */
export function buildProductionPrompt(preset: ProductionPreset): string {
    return buildSceneDescription(preset)
}

/**
 * Log production pipeline status.
 */
export function logProductionPipelineStatus(presetId: string, mode: string): void {
    console.log(`\n🎬 PRODUCTION PIPELINE`)
    console.log(`   📍 Preset: ${presetId}`)
    console.log(`   🔄 Mode: ${mode}`)
    console.log(`   🧊 Face Freeze: ACTIVE`)
    console.log(`   👕 Clothing Replace: MANDATORY`)
    console.log(`   📸 Camera: iPhone/DSLR simulation`)
}

// ═══════════════════════════════════════════════════════════════
// VALIDATION THRESHOLDS
// ═══════════════════════════════════════════════════════════════

export const VALIDATION_THRESHOLDS = {
    face_similarity_min: 0.90,      // Face must be 90%+ identical
    head_size_diff_max: 0.03,       // Head size ratio ≤ 3% difference
    garment_change_visible: true,   // Garment must be visibly changed
    no_floating_limbs: true,        // No floating hands/arms
    no_mannequin_pose: true,        // No mannequin stance
}

export interface ValidationResult {
    passed: boolean
    face_similarity: number
    head_size_ratio_diff: number
    garment_changed: boolean
    limbs_grounded: boolean
    pose_natural: boolean
    failures: string[]
}

/**
 * Check if result should trigger retry.
 */
export function shouldRetry(result: ValidationResult): boolean {
    return !result.passed && result.failures.length > 0
}
