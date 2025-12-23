/**
 * PHOTOSHOOT PRESETS - PRODUCTION GRADE
 * 
 * These are CLEAN, PROFESSIONAL presets designed for:
 * - Brand campaigns
 * - Fashion editorials
 * - Premium lifestyle content
 * 
 * NO messy stereotypes. NO clutter by default.
 * Each preset looks like a real photoshoot.
 */

import type { ScenePreset } from './india'

// ═══════════════════════════════════════════════════════════════════════════════
// STUDIO / CAMPAIGN (10 presets)
// ═══════════════════════════════════════════════════════════════════════════════

const STUDIO_PRESETS: ScenePreset[] = [
    {
        id: 'studio_seamless_white',
        label: 'Seamless White Studio',
        category: 'lifestyle',
        region: 'global',
        scene: 'Professional studio with seamless white backdrop, clean infinity curve floor, no visible edges or corners',
        lighting: 'Softbox lighting from 45° front-left, fill light from right, even illumination, minimal shadows',
        camera: '85mm portrait lens, chest-up framing, shallow depth with backdrop in focus',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No colored gels, no dramatic shadows, no harsh contrast'
    },
    {
        id: 'studio_grey_cyc',
        label: 'Grey Cyclorama',
        category: 'lifestyle',
        region: 'global',
        scene: 'Neutral grey cyclorama wall, seamless floor-to-wall curve, professional studio environment',
        lighting: 'Large softbox overhead, subtle fill from below, even gradient on backdrop',
        camera: '50mm standard lens, full body or 3/4 shot, deep depth of field',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No colored backgrounds, no props, no distractions'
    },
    {
        id: 'studio_black_matte',
        label: 'Matte Black Backdrop',
        category: 'lifestyle',
        region: 'global',
        scene: 'Deep matte black studio backdrop, non-reflective surface, minimal setup',
        lighting: 'Single key light from side, subtle rim light for separation, dark background',
        camera: '85mm lens, chest-up portrait framing, subject isolated from background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No colored lights, no smoke, no theatrical effects'
    },
    {
        id: 'studio_fashion_editorial',
        label: 'Fashion Editorial Studio',
        category: 'lifestyle',
        region: 'global',
        scene: 'High-end fashion studio, large windows with diffusion panels, clean concrete floor',
        lighting: 'Natural window light mixed with studio strobes, soft wraparound quality',
        camera: '70-200mm zoom at 100mm, full body fashion shot, clean background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cluttered props, no busy backgrounds'
    },
    {
        id: 'studio_hardlight_editorial',
        label: 'Hard Light Editorial',
        category: 'lifestyle',
        region: 'global',
        scene: 'Minimalist studio with clean white or grey wall, hard shadows visible',
        lighting: 'Single hard light source (bare bulb or focused strobe), defined shadows',
        camera: '50mm lens, fashion editorial framing, crisp focus',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No soft romantic lighting, no fill light'
    },
    {
        id: 'studio_catalog',
        label: 'E-commerce Catalog',
        category: 'lifestyle',
        region: 'global',
        scene: 'Clean e-commerce photography setup, pure white background, product-focused',
        lighting: 'Even, flat lighting from multiple softboxes, no shadows',
        camera: '50mm lens, full body shot, garment clearly visible, sharp focus throughout',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No creative lighting, no artistic blur, no props'
    },
    {
        id: 'studio_cream_backdrop',
        label: 'Cream Paper Backdrop',
        category: 'lifestyle',
        region: 'global',
        scene: 'Warm cream/beige seamless paper backdrop, subtle texture visible, studio floor',
        lighting: 'Soft diffused daylight-balanced lighting, gentle shadows',
        camera: '85mm portrait lens, 3/4 body shot, warm tones',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cold tones, no harsh shadows'
    },
    {
        id: 'studio_pastel_mint',
        label: 'Pastel Mint Studio',
        category: 'lifestyle',
        region: 'global',
        scene: 'Soft pastel mint green backdrop, smooth gradient, clean studio',
        lighting: 'Beauty lighting setup, large softbox above, fill from below',
        camera: '85mm lens, chest-up framing, shallow depth of field',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No saturated colors, no neon'
    },
    {
        id: 'studio_terracotta',
        label: 'Terracotta Studio',
        category: 'lifestyle',
        region: 'global',
        scene: 'Warm terracotta/rust colored backdrop, earthy tones, clean setup',
        lighting: 'Warm-toned lighting, soft shadows, golden hour simulation',
        camera: '50mm lens, lifestyle positioning, natural stance',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cool tones, no blue cast'
    },
    {
        id: 'studio_textured_wall',
        label: 'Textured Plaster Wall',
        category: 'lifestyle',
        region: 'global',
        scene: 'Studio with textured plaster wall in neutral tone, visible texture adds depth',
        lighting: 'Side lighting to emphasize wall texture, soft key light on subject',
        camera: '50mm lens, environmental portrait, wall texture visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No flat backgrounds, but no distracting patterns'
    }
]

// ═══════════════════════════════════════════════════════════════════════════════
// LIFESTYLE PREMIUM (10 presets)
// ═══════════════════════════════════════════════════════════════════════════════

const LIFESTYLE_PRESETS: ScenePreset[] = [
    {
        id: 'lifestyle_cafe_modern',
        label: 'Modern Café',
        category: 'lifestyle',
        region: 'global',
        scene: 'Contemporary café interior, marble table, clean minimalist decor, large windows',
        lighting: 'Natural daylight from large windows, soft shadows, warm ambient',
        camera: '35mm lens, seated perspective, background softly blurred',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cluttered tables, no visible trash'
    },
    {
        id: 'lifestyle_balcony_golden',
        label: 'Balcony Golden Hour',
        category: 'home',
        region: 'global',
        scene: 'Clean apartment balcony, glass railing, city skyline, golden hour light',
        lighting: 'Golden hour sunlight from side, warm glow, soft long shadows',
        camera: '50mm lens, standing pose, city bokeh in background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No drying clothes, no clutter, no water tanks'
    },
    {
        id: 'lifestyle_minimal_living',
        label: 'Minimal Living Room',
        category: 'home',
        region: 'global',
        scene: 'Contemporary minimal living room, neutral sofa, clean lines, tasteful decor',
        lighting: 'Large window natural light, soft shadows, bright and airy',
        camera: '35mm lens, lifestyle shot, room context visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No messy furniture, no cluttered surfaces'
    },
    {
        id: 'lifestyle_hotel_corridor',
        label: 'Hotel Corridor',
        category: 'lifestyle',
        region: 'global',
        scene: 'Upscale hotel hallway, warm lighting, tasteful carpet, clean walls',
        lighting: 'Warm tungsten wall sconces, soft ambient, no harsh spots',
        camera: '35mm lens, walking pose, corridor depth visible',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No institutional look, no fluorescent lighting'
    },
    {
        id: 'lifestyle_window_daylight',
        label: 'Window Daylight',
        category: 'home',
        region: 'global',
        scene: 'Standing near large window, sheer curtains, clean interior, daylight streaming in',
        lighting: 'Bright natural window light, soft diffusion through curtains',
        camera: '50mm lens, 3/4 body shot, window light wrapping around subject',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No dark shadows, no underexposed areas'
    },
    {
        id: 'lifestyle_restaurant_evening',
        label: 'Restaurant Evening',
        category: 'lifestyle',
        region: 'global',
        scene: 'Upscale restaurant interior, warm ambient lighting, elegant decor, table setting',
        lighting: 'Warm candlelight and ambient restaurant lighting, soft glow',
        camera: '50mm lens, seated perspective, shallow depth of field',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh flash, no busy background'
    },
    {
        id: 'lifestyle_lobby_modern',
        label: 'Modern Lobby',
        category: 'lifestyle',
        region: 'global',
        scene: 'Contemporary hotel or office lobby, clean design, marble or wood floors',
        lighting: 'Mixed natural and artificial, bright and welcoming',
        camera: '35mm lens, standing full body, architectural context',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No busy crowds, no cluttered space'
    },
    {
        id: 'lifestyle_bookstore',
        label: 'Bookstore',
        category: 'lifestyle',
        region: 'global',
        scene: 'Cozy bookstore interior, wooden shelves, warm lighting, books in background',
        lighting: 'Warm tungsten lighting, cozy atmosphere, soft shadows',
        camera: '50mm lens, browsing pose, shelves creating depth',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh lighting, no messy shelves'
    },
    {
        id: 'lifestyle_rooftop_day',
        label: 'Rooftop Daytime',
        category: 'outdoor',
        region: 'global',
        scene: 'Clean rooftop terrace, modern furniture, city view, blue sky',
        lighting: 'Bright daylight, open shade or soft cloud cover',
        camera: '35mm lens, lifestyle standing, skyline in background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No industrial equipment, no messy rooftop'
    },
    {
        id: 'lifestyle_art_gallery',
        label: 'Art Gallery',
        category: 'lifestyle',
        region: 'global',
        scene: 'Minimalist art gallery, white walls, polished floor, sparse artwork',
        lighting: 'Gallery track lighting, even illumination, clean shadows',
        camera: '35mm lens, standing contemplative, gallery space visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No crowded gallery, no busy artwork'
    }
]

// ═══════════════════════════════════════════════════════════════════════════════
// CELEBRATION / OCCASION (10 presets)
// ═══════════════════════════════════════════════════════════════════════════════

const CELEBRATION_PRESETS: ScenePreset[] = [
    {
        id: 'celebration_festive_lights',
        label: 'Festive Evening Lights',
        category: 'lifestyle',
        region: 'india',
        scene: 'Tasteful festive setting, warm string lights, elegant decor, evening ambiance',
        lighting: 'Warm fairy lights and candles, soft golden glow, low ambient',
        camera: '50mm lens, chest-up, bokeh lights in background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh flash, no overcrowded space'
    },
    {
        id: 'celebration_wedding_guest',
        label: 'Wedding Guest',
        category: 'lifestyle',
        region: 'india',
        scene: 'Elegant wedding venue, tasteful floral decor, warm lighting, sophisticated atmosphere',
        lighting: 'Warm venue lighting, chandeliers, soft ambient glow',
        camera: '85mm lens, portrait framing, venue bokeh',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No chaotic crowds, no harsh event lighting'
    },
    {
        id: 'celebration_birthday_dinner',
        label: 'Birthday Dinner',
        category: 'lifestyle',
        region: 'global',
        scene: 'Restaurant private dining, birthday setup, candles, elegant table',
        lighting: 'Warm candlelight, ambient restaurant lighting',
        camera: '50mm lens, seated perspective, table setting visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No balloons everywhere, no childish decor'
    },
    {
        id: 'celebration_rooftop_night',
        label: 'Rooftop Night City',
        category: 'lifestyle',
        region: 'global',
        scene: 'Upscale rooftop lounge, city lights bokeh, evening sky, sophisticated setting',
        lighting: 'Ambient city lights, subtle venue lighting, blue hour sky',
        camera: '35mm lens, standing lifestyle, city bokeh behind',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh club lighting, no neon'
    },
    {
        id: 'celebration_diwali_home',
        label: 'Diwali Home',
        category: 'home',
        region: 'india',
        scene: 'Home decorated for Diwali, diyas and candles, rangoli visible, warm festive glow',
        lighting: 'Warm diya light, golden ambient, soft shadows',
        camera: '50mm lens, 3/4 body, festive decor in background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No overcrowded decorations, no harsh flash'
    },
    {
        id: 'celebration_sangeet',
        label: 'Sangeet Night',
        category: 'lifestyle',
        region: 'india',
        scene: 'Sangeet event venue, colorful drapes, stage lights, dance floor visible',
        lighting: 'Colorful but tasteful event lighting, warm tones dominant',
        camera: '50mm lens, party atmosphere, movement suggested',
        motion: 'candid motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh spotlights on subject'
    },
    {
        id: 'celebration_haldi',
        label: 'Haldi Ceremony',
        category: 'lifestyle',
        region: 'india',
        scene: 'Haldi ceremony outdoors, yellow florals, marigold decor, sunny day',
        lighting: 'Bright natural daylight, warm yellow tones from decor',
        camera: '35mm lens, candid celebration shot, outdoor venue',
        motion: 'candid motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No muddy chaos, no messy ground'
    },
    {
        id: 'celebration_cocktail_party',
        label: 'Cocktail Party',
        category: 'lifestyle',
        region: 'global',
        scene: 'Upscale cocktail party venue, bar in background, sophisticated guests',
        lighting: 'Ambient bar lighting, warm and inviting',
        camera: '50mm lens, standing socializing, shallow depth',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No harsh flash, no red-eye lighting'
    },
    {
        id: 'celebration_mehendi',
        label: 'Mehendi Day',
        category: 'lifestyle',
        region: 'india',
        scene: 'Mehendi ceremony setup, cushions, floral decor, afternoon light',
        lighting: 'Soft afternoon daylight, filtered through shamiana',
        camera: '35mm lens, seated traditional, decor visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No mess, no scattered items'
    },
    {
        id: 'celebration_new_year',
        label: 'New Year Party',
        category: 'lifestyle',
        region: 'global',
        scene: 'New Year celebration, elegant venue, subtle sparkle, champagne setting',
        lighting: 'Warm party lighting, fairy lights, festive but elegant',
        camera: '50mm lens, party portrait, sparkle bokeh',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No loud decorations, no plastic party items'
    }
]

// ═══════════════════════════════════════════════════════════════════════════════
// OUTDOOR CLEAN (10 presets)
// ═══════════════════════════════════════════════════════════════════════════════

const OUTDOOR_PRESETS: ScenePreset[] = [
    {
        id: 'outdoor_heritage_wall',
        label: 'Heritage Wall (Clean)',
        category: 'outdoor',
        region: 'india',
        scene: 'Clean heritage stone wall, well-maintained, warm sandstone texture',
        lighting: 'Golden hour side light, warm tones, long soft shadows',
        camera: '50mm lens, 3/4 body, wall texture visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No peeling paint, no graffiti, no trash'
    },
    {
        id: 'outdoor_courtyard',
        label: 'Courtyard Garden',
        category: 'outdoor',
        region: 'india',
        scene: 'Well-maintained courtyard, potted plants, terracotta pots, clean tiles',
        lighting: 'Dappled light through trees, soft shadows, natural light',
        camera: '35mm lens, environmental portrait, greenery visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No overgrown plants, no dirt, no clutter'
    },
    // REMOVED: outdoor_urban_quiet - complex scene
    {
        id: 'outdoor_park_morning',
        label: 'Morning Park',
        category: 'outdoor',
        region: 'global',
        scene: 'Early morning park, dewy grass, clean pathways, trees in background',
        lighting: 'Early morning golden light, slight mist, long shadows',
        camera: '50mm lens, lifestyle shot, park depth visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No joggers, no crowded paths'
    },
    {
        id: 'outdoor_sunset_walk',
        label: 'Sunset Walkway',
        category: 'outdoor',
        region: 'global',
        scene: 'Clean promenade or walkway, sunset sky, open space',
        lighting: 'Sunset golden hour, warm backlight, rim light on subject',
        camera: '85mm lens, portrait with sunset bokeh, warm tones',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No crowds, no street vendors'
    },
    {
        id: 'outdoor_beach_golden',
        label: 'Beach Golden Hour',
        category: 'outdoor',
        region: 'global',
        scene: 'Clean beach, golden sand, calm waves, sunset sky',
        lighting: 'Golden hour warm light, ocean reflecting light',
        camera: '50mm lens, 3/4 body, ocean in background',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No beach umbrellas, no crowds, no trash'
    },
    {
        id: 'outdoor_garden_flowers',
        label: 'Flower Garden',
        category: 'outdoor',
        region: 'global',
        scene: 'Well-maintained flower garden, colorful blooms, trimmed hedges',
        lighting: 'Soft overcast or open shade, even natural light',
        camera: '85mm lens, portrait with flower bokeh, shallow depth',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No wilted flowers, no messy patches'
    },
    {
        id: 'outdoor_lake_peaceful',
        label: 'Peaceful Lake',
        category: 'outdoor',
        region: 'global',
        scene: 'Calm lake or pond, trees reflected, serene atmosphere',
        lighting: 'Soft morning or evening light, water reflections',
        camera: '50mm lens, environmental portrait, water visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No boats, no fishermen, no crowds'
    },
    {
        id: 'outdoor_mountain_vista',
        label: 'Mountain Vista',
        category: 'outdoor',
        region: 'global',
        scene: 'Mountain viewpoint, clear sky, dramatic landscape behind',
        lighting: 'Bright daylight, blue sky, natural outdoor',
        camera: '35mm lens, traveler pose, landscape context',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No tourist groups, no signboards'
    },
    {
        id: 'outdoor_forest_path',
        label: 'Forest Path',
        category: 'outdoor',
        region: 'global',
        scene: 'Quiet forest trail, dappled light through trees, natural path',
        lighting: 'Filtered forest light, green tones, soft shadows',
        camera: '35mm lens, walking shot, forest depth',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No crowds, no signs, no trash bins'
    }
]

// ═══════════════════════════════════════════════════════════════════════════════
// URBAN CINEMATIC (10 presets)
// ═══════════════════════════════════════════════════════════════════════════════

const URBAN_CINEMATIC_PRESETS: ScenePreset[] = [
    {
        id: 'urban_quiet_dusk',
        label: 'Quiet Street Dusk',
        category: 'street',
        region: 'global',
        scene: 'Quiet city street at dusk, warm street lights starting, blue hour sky',
        lighting: 'Blue hour ambient with warm street lights, mixed color temperature',
        camera: '35mm lens, full body, street perspective',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No busy traffic, no harsh lighting'
    },
    {
        id: 'urban_concrete_brutalist',
        label: 'Concrete Brutalist',
        category: 'outdoor',
        region: 'global',
        scene: 'Brutalist architecture, raw concrete walls, geometric shapes',
        lighting: 'Dramatic side light, architectural shadows, overcast sky',
        camera: '35mm lens, architectural framing, subject against concrete',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No graffiti, no construction debris'
    },
    {
        id: 'urban_staircase_geometry',
        label: 'Staircase Geometry',
        category: 'lifestyle',
        region: 'global',
        scene: 'Modern staircase, clean lines, geometric railings, well-lit',
        lighting: 'Ambient building light, soft shadows on steps',
        camera: '28mm wide lens, emphasize geometry, subject on stairs',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No institutional fluorescent, no clutter'
    },
    {
        id: 'urban_parking_shadow',
        label: 'Parking Structure Soft Shadow',
        category: 'outdoor',
        region: 'global',
        scene: 'Modern parking structure, clean concrete, repeating columns',
        lighting: 'Soft ambient light, open shade from structure, even shadows',
        camera: '50mm lens, portrait with structural background',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No cars, no harsh direct sun'
    },
    {
        id: 'urban_metro_platform',
        label: 'Metro Platform Clean',
        category: 'street',
        region: 'global',
        scene: 'Clean metro station platform, modern design, minimal people',
        lighting: 'Even overhead lighting, no harsh spots',
        camera: '35mm lens, waiting pose, platform depth visible',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No crowded platform, no dirty floors'
    },
    {
        id: 'urban_bridge_evening',
        label: 'Bridge Evening Light',
        category: 'outdoor',
        region: 'global',
        scene: 'Pedestrian bridge, city lights in distance, evening sky',
        lighting: 'Blue hour with city lights reflected, warm streetlamps',
        camera: '50mm lens, standing on bridge, city bokeh behind',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No busy traffic, no harsh lights'
    },
    {
        id: 'urban_museum_exterior',
        label: 'Museum Exterior',
        category: 'outdoor',
        region: 'global',
        scene: 'Modern museum exterior, clean architectural lines, plaza',
        lighting: 'Bright daylight, architectural shadows, blue sky',
        camera: '35mm lens, architectural context, subject in plaza',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No tourist crowds, no signs'
    },
    // REMOVED: urban_alley_sunlight - complex scene
    {
        id: 'urban_glass_reflection',
        label: 'Glass Building Reflection',
        category: 'outdoor',
        region: 'global',
        scene: 'Modern glass-facade building, reflective surface, city reflected',
        lighting: 'Overcast sky, soft reflections in glass',
        camera: '35mm lens, subject with glass building behind',
        motion: 'static',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No direct sun glare, no busy reflections'
    },
    {
        id: 'urban_underpass_tunnel',
        label: 'Underpass Tunnel',
        category: 'street',
        region: 'global',
        scene: 'Clean urban underpass or tunnel, even lighting, concrete walls',
        lighting: 'Even artificial tunnel lighting, no harsh shadows',
        camera: '35mm lens, subject walking through, tunnel depth',
        motion: 'subtle motion',
        mood: 'candid',
        style: 'realism',
        negative_bias: 'No graffiti, no homeless camps, no debris'
    }
]

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT ALL PHOTOSHOOT PRESETS (50 TOTAL)
// ═══════════════════════════════════════════════════════════════════════════════

export const PHOTOSHOOT_PRESETS: ScenePreset[] = [
    ...STUDIO_PRESETS,
    ...LIFESTYLE_PRESETS,
    ...CELEBRATION_PRESETS,
    ...OUTDOOR_PRESETS,
    ...URBAN_CINEMATIC_PRESETS
]

export function getPhotoshootPreset(id: string): ScenePreset | undefined {
    return PHOTOSHOOT_PRESETS.find(p => p.id === id)
}

export function getPhotoshootPresetsByCategory(category: ScenePreset['category']): ScenePreset[] {
    return PHOTOSHOOT_PRESETS.filter(p => p.category === category)
}

/**
 * Get all photoshoot preset IDs for validation
 */
export function getPhotoshootPresetIds(): string[] {
    return PHOTOSHOOT_PRESETS.map(p => p.id)
}

// Log count for verification
console.log(`📸 Loaded ${PHOTOSHOOT_PRESETS.length} photoshoot-grade presets`)
