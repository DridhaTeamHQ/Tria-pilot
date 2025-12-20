/**
 * INDIAN PRESETS - REALISTIC SITUATIONS
 * 
 * CORE PHILOSOPHY:
 * Describe the SITUATION and ENVIRONMENT only.
 * Describe MESS, CLUTTER, and IMPERFECTION.
 * NEVER describe the person or "vibes".
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
    scene: string      // DETAILED ENVIRONMENT with clutter/mess
    lighting: string   // PHYSICS-BASED lighting description
    camera: string     // LENS behavior (iPhone/Consumer)
    motion: 'static' | 'subtle motion' | 'candid motion'
    mood: 'candid'     // Default mood
    style: 'realism'   // Default style
    negative_bias: string
}

export const INDIAN_PRESETS: ScenePreset[] = [
    // ═══════════════════════════════════════════════════════════════
    // HOME / INDOOR (Lived-in, messy, real)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'india_home_living',
        label: 'Living Room (Real)',
        category: 'home',
        region: 'india',
        scene: 'Middle-class Indian living room, slight clutter on center table, newspaper, remote control, mismatched cushions on sofa, curtain slightly uneven, family photos on wall, ceiling fan visible',
        lighting: 'Natural daylight from balcony door, mixing with tube light reflection on floor, uneven shadows',
        camera: 'iPhone 26mm lens equivalent, slight wide angle distortion at edges',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No studio lighting, no perfect decor, no staged furniture'
    },
    {
        id: 'india_bedroom_messy',
        label: 'Bedroom (Morning)',
        category: 'home',
        region: 'india',
        scene: 'Indian bedroom, unmade bed, clothes draped over chair, phone charger cable visible, water bottle on side table, window curtains partially open',
        lighting: 'Morning sunlight hitting one side of room, dust particles visible in light beam, rest of room in shadow',
        camera: 'Handheld phone camera, eye level, imperfect framing',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No hotel room look, no perfect bedsheets, no symmetry'
    },
    {
        id: 'india_kitchen_daily',
        label: 'Kitchen (Cooking)',
        category: 'home',
        region: 'india',
        scene: 'Active Indian kitchen, pressure cooker on stove, steel utensils drying in rack, spice box open, vegetable peels on counter, granite slab texture',
        lighting: 'Overhead tube light mixing with window light, harsh reflections on steel',
        camera: 'Wide angle 24mm, slightly high angle looking down',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No modular kitchen brochure look, no clean counters'
    },

    // ═══════════════════════════════════════════════════════════════
    // STREET / URBAN (Chaotic, textured)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'india_street_market',
        label: 'Market Street',
        category: 'street',
        region: 'india',
        scene: 'Crowded market lane, vegetable vendors with carts, plastic tarps overhead, tangled electrical wires, two-wheelers parked unevenly, worn asphalt',
        lighting: 'Harsh midday sun filtered through tarps, creating patchy colored light and jagged shadows',
        camera: 'Phone camera, snap-shot style, busy background',
        motion: 'candid motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No bokeh, no clean streets, no isolated subject'
    },
    {
        id: 'india_gully_calm',
        label: 'Quiet Gully',
        category: 'street',
        region: 'india',
        scene: 'Narrow residential street, painted concrete walls with peeling paint, potted plants on ledges, parked scooter, drain cover visible',
        lighting: 'Soft evening shadow, light bouncing from opposite wall, cool ambient tone',
        camera: 'Eye level, neutral perspective, deep depth of field',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cinematic color grading, no dramatic sunset'
    },
    {
        id: 'india_chai_shop',
        label: 'Chai Shop',
        category: 'street',
        region: 'india',
        scene: 'Roadside tea stall, glass tumblers, biscuits in jars, wooden bench, cigarette shop nearby, waste bin visible',
        lighting: 'Tubelight from shop mixing with street light (blue hour), mixed color temperatures',
        camera: 'Low angle or seated perspective, handheld',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No romanticized poverty, no travel vlog aesthetic'
    },

    // ═══════════════════════════════════════════════════════════════
    // OFFICE / WORK (Boring, standard)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'india_office_cubicle',
        label: 'Office Cubicle',
        category: 'office',
        region: 'india',
        scene: 'Standard cubicle desk, notepad, water bottle, sticky notes, laptop dock, office chair background, grey carpet tiles',
        lighting: 'Overhead 6000K fluorescent lighting, flat and even, slight screen glow',
        camera: 'Webcam or phone selfie angle, slight distortion',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No stock photo smile, no perfect desk'
    },
    {
        id: 'india_coworking',
        label: 'Co-working Space',
        category: 'office',
        region: 'india',
        scene: 'Casual work table, coffee mug, tangled charger wires, glass partition in background, indoor plant',
        lighting: 'Warm hanging light, softer shadows, cozy indoors',
        camera: 'Eye level, casual framing',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No startup brochure look'
    },

    // ═══════════════════════════════════════════════════════════════
    // OUTDOOR / TRAVEL (Non-tourist)
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'india_park_morning',
        label: 'Morning Walk',
        category: 'outdoor',
        region: 'india',
        scene: 'Public park, uneven walking path, metal benches, dry leaves on ground, other walkers in distance',
        lighting: 'Early morning sun, long shadows, slight mist/haze',
        camera: 'Wide shot, deep focus, handheld',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No dreamy glow, no perfect landscaping'
    },
    {
        id: 'india_terrace_chill',
        label: 'Terrace Evening',
        category: 'home',
        region: 'india',
        scene: 'Roof terrace, water tanks, drying clothes line in background, plastic chairs, city skyline silhouette',
        lighting: 'Dusk/Twilight, fading heavy blue sky, yellow streetlights starting in distance',
        camera: 'Phone camera night mode, slight grain',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No party vibes, no dramatic sky'
    },
    {
        id: 'india_auto_rickshaw',
        label: 'Auto Rickshaw',
        category: 'travel',
        region: 'india',
        scene: 'Inside auto rickshaw, meter visible, driver back of head, passing city blur outside, vinyl seat texture',
        lighting: 'Natural side light entering moving vehicle, dynamic shadows',
        camera: 'Selfie perspective or POV, motion blur outside',
        motion: 'candid motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No travel documentary glam'
    }
]

export function getIndianPresets(): ScenePreset[] {
    return INDIAN_PRESETS
}

export function getIndianPreset(id: string): ScenePreset | undefined {
    return INDIAN_PRESETS.find(p => p.id === id)
}

export function getIndianPresetsByCategory(category: ScenePreset['category']): ScenePreset[] {
    return INDIAN_PRESETS.filter(p => p.category === category)
}

export const DEFAULT_INDIAN_PRESET = INDIAN_PRESETS.find(p => p.id === 'india_home_living')!
