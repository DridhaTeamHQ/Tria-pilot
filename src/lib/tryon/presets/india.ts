/**
 * INDIAN PRESETS - Environment-Only Scene Presets
 * 
 * CRITICAL: These presets describe ONLY the environment.
 * They must NEVER describe the subject, pose, or appearance.
 * 
 * FORBIDDEN WORDS: editorial, portrait, fashion, pose, hero shot, influencer
 * ALLOWED: environment, lighting, camera, background elements
 */

export interface ScenePreset {
    id: string
    label: string
    category: 'lifestyle' | 'street' | 'home' | 'travel' | 'editorial' | 'ugc'
    region: 'india' | 'global'
    scene: string      // Environment ONLY - no subject language
    lighting: string   // Light sources and quality
    camera: string     // Lens and optics
    motion: 'static' | 'subtle motion' | 'candid motion'
    mood: 'calm' | 'candid' | 'confident' | 'everyday' | 'aspirational'
    style: string      // Photo style - no subject language
    negative_bias: string
}

export const INDIAN_PRESETS: ScenePreset[] = [
    // ═══════════════════════════════════════════════════════════════
    // HOME / INDOOR
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'india_home_lifestyle',
        label: 'Indian Home',
        category: 'lifestyle',
        region: 'india',
        scene: 'Middle-class Indian apartment, indoor plants, framed family photos, sheer curtains, everyday furniture, lived-in warmth',
        lighting: 'Soft daylight from window, warm bounce from painted walls, gentle natural shadows',
        camera: '50mm lens, eye-level perspective, natural depth of field',
        motion: 'subtle motion',
        mood: 'everyday',
        style: 'realistic, unfiltered',
        negative_bias: 'No studio lighting, no perfect interiors, no minimalist decor'
    },
    {
        id: 'india_home_morning',
        label: 'Indian Home – Morning',
        category: 'home',
        region: 'india',
        scene: 'Indian living room or bedroom, morning sunlight through curtains, bed or sofa visible, everyday items',
        lighting: 'Strong morning directional light with warm orange tones, deep shadows in corners',
        camera: '35mm wide lens, environmental perspective',
        motion: 'static',
        mood: 'calm',
        style: 'morning warmth, realistic',
        negative_bias: 'No artificial glow, no staged decor'
    },
    {
        id: 'india_kitchen_candid',
        label: 'Indian Kitchen',
        category: 'lifestyle',
        region: 'india',
        scene: 'Modest Indian kitchen, steel utensils, pressure cooker, gas stove, spice jars, worn countertops, natural clutter',
        lighting: 'Mixed: daylight from window, warm tungsten bulb, realistic color cast',
        camera: '28mm wide angle, candid handheld perspective',
        motion: 'candid motion',
        mood: 'everyday',
        style: 'authentic, smartphone capture',
        negative_bias: 'No modular kitchens, no marble counters, no studio lighting'
    },

    // ═══════════════════════════════════════════════════════════════
    // STREET / URBAN
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'india_street_urban',
        label: 'Indian Street',
        category: 'street',
        region: 'india',
        scene: 'Urban Indian street, painted shop signage, textured walls, parked two-wheelers, pedestrians, electrical wires overhead',
        lighting: 'Late afternoon sun, directional from side, soft contrast, warm shadows',
        camera: '85mm lens, shallow depth of field',
        motion: 'subtle motion',
        mood: 'confident',
        style: 'street photography',
        negative_bias: 'No fake bokeh, no oversaturated colors, no CGI surfaces'
    },
    {
        id: 'india_market_candid',
        label: 'Indian Market',
        category: 'street',
        region: 'india',
        scene: 'Busy Indian market lane, vegetable stalls, hanging fabrics, shopkeepers, natural chaos of commerce',
        lighting: 'Harsh midday sun with patchy shade from awnings, high contrast',
        camera: '35mm lens, handheld style, environmental framing',
        motion: 'candid motion',
        mood: 'candid',
        style: 'documentary',
        negative_bias: 'No clean backgrounds, no artificial staging'
    },
    {
        id: 'india_chai_stall',
        label: 'Chai Stall',
        category: 'street',
        region: 'india',
        scene: 'Roadside chai stall, steel kettle, glass cups, wooden bench, smoke rising, morning newspaper readers nearby',
        lighting: 'Soft morning light mixed with chai steam haze, gentle atmospheric diffusion',
        camera: '50mm lens, intimate framing, moderate depth of field',
        motion: 'subtle motion',
        mood: 'calm',
        style: 'nostalgic realism',
        negative_bias: 'No hipster coffee shop vibes'
    },

    // ═══════════════════════════════════════════════════════════════
    // ROOFTOP / OUTDOOR
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'india_rooftop_evening',
        label: 'Indian Rooftop – Evening',
        category: 'lifestyle',
        region: 'india',
        scene: 'Indian city rooftop, skyline visible, water tanks, potted tulsi plants, weathered chairs, open sky, distant buildings',
        lighting: 'Golden hour sunlight, long soft shadows, warm orange-pink sky gradient',
        camera: '35mm lens, environmental wide framing',
        motion: 'subtle motion',
        mood: 'aspirational',
        style: 'cinematic realism',
        negative_bias: 'No fake lens flare, no over-edited golden tones, no perfect rooftop gardens'
    },
    {
        id: 'india_terrace_night',
        label: 'Indian Terrace – Night',
        category: 'lifestyle',
        region: 'india',
        scene: 'Urban terrace at night, fairy lights, plastic chairs, city lights in distance, neighbor buildings visible',
        lighting: 'Mixed: warm fairy lights, cool city glow, subtle tungsten from stairs',
        camera: '28mm wide angle, low-light look, visible grain',
        motion: 'static',
        mood: 'calm',
        style: 'night photography',
        negative_bias: 'No heavy flash, no artificial neon glow'
    },

    // ═══════════════════════════════════════════════════════════════
    // TRAVEL / OUTDOOR
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'india_beach_goa',
        label: 'Goa Beach',
        category: 'travel',
        region: 'india',
        scene: 'Goan beach, palm trees, fishing boats in distance, beach shacks visible, local vendors, natural sand texture',
        lighting: 'Bright coastal sun with water reflections, fill light from sand bounce',
        camera: '35mm lens, vacation snapshot style, deep depth of field',
        motion: 'candid motion',
        mood: 'candid',
        style: 'travel photography',
        negative_bias: 'No Caribbean styling, no resort luxury'
    },
    {
        id: 'india_hill_station',
        label: 'Hill Station',
        category: 'travel',
        region: 'india',
        scene: 'Indian hill station, colonial bungalows, pine trees, mist rolling through, winding mountain road visible',
        lighting: 'Soft overcast light with atmospheric mist, gentle fog diffusion',
        camera: '50mm lens, soft environmental bokeh',
        motion: 'static',
        mood: 'calm',
        style: 'atmospheric landscape',
        negative_bias: 'No Swiss Alps styling'
    },
    {
        id: 'india_temple_courtyard',
        label: 'Temple Courtyard',
        category: 'travel',
        region: 'india',
        scene: 'South Indian temple courtyard, carved stone pillars, worn granite floor, oil lamps, devotees in background',
        lighting: 'Dappled afternoon light through courtyard, warm stone reflections',
        camera: '35mm lens, architectural context, deep focus',
        motion: 'static',
        mood: 'calm',
        style: 'heritage documentary',
        negative_bias: 'No touristy poses, no over-saturated colors'
    },

    // ═══════════════════════════════════════════════════════════════
    // OFFICE / WORK
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'india_office_modern',
        label: 'Indian Office',
        category: 'lifestyle',
        region: 'india',
        scene: 'Modern Indian IT office, glass partitions, ergonomic chairs, dual monitors, water bottles, motivational posters',
        lighting: 'Mixed fluorescent and window light, typical office color temperature',
        camera: '50mm lens, clean background',
        motion: 'static',
        mood: 'confident',
        style: 'corporate professional',
        negative_bias: 'No Silicon Valley aesthetics'
    },
    {
        id: 'india_cafe_cowork',
        label: 'Work Café',
        category: 'lifestyle',
        region: 'india',
        scene: 'Urban Indian cafe, exposed brick or painted walls, other patrons, coffee cup, laptop',
        lighting: 'Warm cafe lighting mixed with daylight from window, cozy ambiance',
        camera: '35mm lens, environmental perspective, shallow depth of field',
        motion: 'subtle motion',
        mood: 'everyday',
        style: 'contemporary urban',
        negative_bias: 'No Starbucks aesthetics'
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

export const DEFAULT_INDIAN_PRESET = INDIAN_PRESETS.find(p => p.id === 'india_home_lifestyle')!
