/**
 * GLOBAL PRESETS - Environment-Only Scene Presets
 * 
 * CRITICAL: These presets describe ONLY the environment.
 * They must NEVER describe the subject, pose, or appearance.
 */

import type { ScenePreset } from './india'

export const GLOBAL_PRESETS: ScenePreset[] = [
    // ═══════════════════════════════════════════════════════════════
    // STUDIO
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'studio_white',
        label: 'Studio – White',
        category: 'editorial',
        region: 'global',
        scene: 'Photography studio, seamless white paper backdrop, clean minimal setup',
        lighting: 'Three-point studio lighting: soft key from 45°, fill opposite, subtle rim light',
        camera: '85mm lens, f/4-f/5.6, sharp focus',
        motion: 'static',
        mood: 'confident',
        style: 'commercial photography',
        negative_bias: 'No harsh shadows, no colored gels'
    },
    {
        id: 'studio_grey',
        label: 'Studio – Grey',
        category: 'editorial',
        region: 'global',
        scene: 'Photography studio, grey muslin backdrop, subtle texture visible',
        lighting: 'Soft box from camera right, gentle directional shadows',
        camera: '85mm lens, moderate depth of field',
        motion: 'static',
        mood: 'confident',
        style: 'studio photography',
        negative_bias: 'No environmental distractions'
    },

    // ═══════════════════════════════════════════════════════════════
    // URBAN / STREET
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'urban_street_day',
        label: 'Urban Street – Day',
        category: 'street',
        region: 'global',
        scene: 'City sidewalk, urban textures, weathered walls, street elements, pedestrians in background',
        lighting: 'Natural daylight, diffused sky, soft shadows',
        camera: '35mm lens, handheld style, environmental framing',
        motion: 'candid motion',
        mood: 'candid',
        style: 'street photography',
        negative_bias: 'No neon cyberpunk, no wet streets without rain'
    },
    {
        id: 'urban_golden_hour',
        label: 'Urban – Golden Hour',
        category: 'street',
        region: 'global',
        scene: 'City environment, buildings catching golden glow, long shadows',
        lighting: 'Low-angle golden sun, warm color temperature, natural rim lighting',
        camera: '50mm lens, warm tones',
        motion: 'subtle motion',
        mood: 'aspirational',
        style: 'golden hour photography',
        negative_bias: 'No over-saturated orange, no fake HDR'
    },

    // ═══════════════════════════════════════════════════════════════
    // CAFE / LIFESTYLE
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'cafe_window',
        label: 'Cafe – Window Light',
        category: 'lifestyle',
        region: 'global',
        scene: 'Cozy cafe interior, window seating, coffee/tea visible, warm ambient decor',
        lighting: 'Soft window light from side, warm indoor ambient, gentle shadows',
        camera: '50mm lens, intimate framing, shallow depth of field',
        motion: 'subtle motion',
        mood: 'calm',
        style: 'lifestyle photography',
        negative_bias: 'No harsh flash'
    },
    {
        id: 'cafe_outdoor',
        label: 'Cafe – Outdoor Terrace',
        category: 'lifestyle',
        region: 'global',
        scene: 'Outdoor cafe terrace, tables, plants, urban street visible',
        lighting: 'Open shade daylight, even soft lighting',
        camera: '35mm lens, environmental perspective, background visible',
        motion: 'candid motion',
        mood: 'candid',
        style: 'travel photography',
        negative_bias: 'No over-styled aesthetic'
    },

    // ═══════════════════════════════════════════════════════════════
    // HOME / INDOOR
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'home_living_room',
        label: 'Home – Living Room',
        category: 'home',
        region: 'global',
        scene: 'Comfortable living room, sofa, natural decor, personal touches, lived-in feel',
        lighting: 'Natural window light, warm afternoon ambiance, soft indoor shadows',
        camera: '35mm lens, environmental framing',
        motion: 'static',
        mood: 'everyday',
        style: 'lifestyle photography',
        negative_bias: 'No minimalist showroom staging'
    },
    {
        id: 'home_bedroom_morning',
        label: 'Home – Bedroom Morning',
        category: 'home',
        region: 'global',
        scene: 'Bedroom, morning light through curtains, bed visible, relaxed atmosphere',
        lighting: 'Soft morning directional light, warm tones',
        camera: '50mm lens, intimate framing',
        motion: 'static',
        mood: 'calm',
        style: 'intimate lifestyle',
        negative_bias: 'No harsh flash'
    },

    // ═══════════════════════════════════════════════════════════════
    // OUTDOOR / NATURE
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'park_afternoon',
        label: 'Park – Afternoon',
        category: 'lifestyle',
        region: 'global',
        scene: 'Urban park, trees, paths, benches, natural greenery',
        lighting: 'Dappled afternoon light through leaves, soft green-tinted bounce',
        camera: '50mm lens, soft background bokeh',
        motion: 'subtle motion',
        mood: 'calm',
        style: 'natural portrait',
        negative_bias: 'No fake volumetric rays'
    },
    {
        id: 'beach_casual',
        label: 'Beach – Casual',
        category: 'travel',
        region: 'global',
        scene: 'Sandy beach, ocean visible, natural beach elements',
        lighting: 'Bright coastal sun, water reflections, fill from sand',
        camera: '35mm lens, vacation snapshot style',
        motion: 'candid motion',
        mood: 'candid',
        style: 'travel photography',
        negative_bias: 'No perfect tropical paradise'
    },

    // ═══════════════════════════════════════════════════════════════
    // UGC / SOCIAL MEDIA
    // ═══════════════════════════════════════════════════════════════
    {
        id: 'ugc_mirror_selfie',
        label: 'Mirror Selfie',
        category: 'ugc',
        region: 'global',
        scene: 'Bathroom or bedroom mirror, visible phone, casual home environment',
        lighting: 'Mixed: bathroom light, window light',
        camera: '28mm wide angle (smartphone), slight distortion',
        motion: 'static',
        mood: 'everyday',
        style: 'authentic social media',
        negative_bias: 'No professional lighting'
    },
    {
        id: 'ugc_outfit_check',
        label: 'Outfit Check',
        category: 'ugc',
        region: 'global',
        scene: 'Full-length mirror or doorway, casual home background',
        lighting: 'Natural daylight from window, smartphone-typical',
        camera: '26mm (iPhone main), full-body framing',
        motion: 'static',
        mood: 'everyday',
        style: 'OOTD aesthetic',
        negative_bias: 'No studio quality'
    }
]

export function getGlobalPresets(): ScenePreset[] {
    return GLOBAL_PRESETS
}

export function getGlobalPreset(id: string): ScenePreset | undefined {
    return GLOBAL_PRESETS.find(p => p.id === id)
}

export function getGlobalPresetsByCategory(category: ScenePreset['category']): ScenePreset[] {
    return GLOBAL_PRESETS.filter(p => p.category === category)
}

export const DEFAULT_GLOBAL_PRESET = GLOBAL_PRESETS.find(p => p.id === 'studio_grey')!
