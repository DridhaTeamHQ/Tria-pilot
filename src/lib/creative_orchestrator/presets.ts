/**
 * AD-GRADE PRESETS
 * 
 * These are NOT vibes. These are RULE BUNDLES that force:
 * - Assertive lighting (never flat)
 * - Biased camera logic (never neutral)
 * - Explicit product dominance
 * - Constrained "natural" (ads must be assertive)
 * 
 * Each preset maps to a strict set of constraints for NanoBanana Pro.
 */

import type {
    CreativeContract,
    LightingMode,
    CameraLogic,
    ColorGrade,
    TextureMode,
    PresetId
} from './types'

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════



export interface AdGradePreset {
    id: PresetId
    name: string
    description: string
    icon: string

    // INTENT - What this preset should achieve
    intent: string

    // LIGHTING RULES - Must be assertive, never flat
    lighting: {
        allowed: LightingMode[]
        required_direction: 'directional' | 'sculpted' | 'single_key'
        background_exposure: 'darker' | 'equal' | 'muted'
        highlight_on_product: boolean
        fill_ratio?: string  // e.g., "controlled", "minimal"
    }

    // CAMERA RULES - Must be biased, never neutral
    camera: {
        angle_bias: 'slightly_low' | 'eye_level' | 'slightly_high' | 'neutral_forbidden' | 'low_angle'
        framing: 'mid_close' | 'rule_of_thirds' | 'locked_poster' | 'editorial_tension' | 'mid_full' | 'mid_shot'
        tilt_allowed: boolean
        depth_of_field: 'intentional' | 'shallow' | 'deep'
    }

    // PRODUCT RULES - Product must dominate
    product: {
        min_visibility: number  // 0.0 to 1.0
        sharpness_priority: 'highest' | 'co_hero' | 'visual_anchor'
        position_rule: string
        face_relationship: 'secondary' | 'supports_product' | 'co_hero'
    }

    // COLOR RULES - Never flat
    color: {
        grade: ColorGrade
        contrast: 'lifted' | 'high' | 'intentional'
        skin_tones: 'warm_preserved' | 'rich' | 'natural'
        background_treatment: 'muted' | 'darker' | 'brand_aligned'
    }

    // TEXTURE/IMPERFECTION RULES
    texture: {
        skin: 'natural_texture' | 'highlight_rolloff' | 'preserved'
        allow_asymmetry: boolean
        retouch: 'none' | 'minimal' | 'editorial'
    }

    // NEGATIVE CONSTRAINTS - Explicit forbidden elements
    negatives: string[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// AD-GRADE PRESET DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const AD_GRADE_PRESETS: Partial<Record<PresetId, AdGradePreset>> = {

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 1: UGC_CANDID_AD_V1
    // Looks spontaneous, but visually CONTROLLED and scroll-stopping
    // ═══════════════════════════════════════════════════════════════════════════════
    UGC_CANDID_AD_V1: {
        id: 'UGC_CANDID_AD_V1',
        name: 'UGC Candid',
        description: 'Spontaneous feel, but scroll-stopping',
        icon: 'Camera',

        intent: 'Looks spontaneous, but visually controlled and scroll-stopping',

        lighting: {
            allowed: ['soft_directional_daylight', 'window_light', 'golden_hour'],
            required_direction: 'directional',  // NOT flat overcast
            background_exposure: 'darker',      // 0.5–1 stop darker than subject
            highlight_on_product: true,         // Subtle highlight on product area
        },

        camera: {
            angle_bias: 'slightly_low',         // Never neutral
            framing: 'mid_close',               // Close enough for impact
            tilt_allowed: true,                 // Minor tilt for spontaneity
            depth_of_field: 'intentional',      // Controlled blur
        },

        product: {
            min_visibility: 0.6,
            sharpness_priority: 'highest',      // Product MUST be sharpest
            position_rule: 'center_of_interest',
            face_relationship: 'secondary',     // Face secondary, background tertiary
        },

        color: {
            grade: 'natural_warm',
            contrast: 'lifted',                 // Slight contrast lift
            skin_tones: 'warm_preserved',       // Warm skin tones preserved
            background_treatment: 'darker',
        },

        texture: {
            skin: 'natural_texture',            // Natural skin texture
            allow_asymmetry: true,              // Minor asymmetry allowed
            retouch: 'none',                    // No retouch polish
        },

        negatives: [
            'no flat overcast look',
            'no catalog framing',
            'no equal exposure across frame',
            'no documentary flatness',
            'no snapshot randomness',
            'no neutral camera angle',
            'no product blur',
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 2: PRODUCT_LIFESTYLE_AD_V1
    // Product integrated into aspirational real-world moment
    // ═══════════════════════════════════════════════════════════════════════════════
    PRODUCT_LIFESTYLE_AD_V1: {
        id: 'PRODUCT_LIFESTYLE_AD_V1',
        name: 'Product Lifestyle',
        description: 'Product in aspirational real-world moment',
        icon: 'ShoppingBag',

        intent: 'Product integrated into aspirational real-world moment',

        lighting: {
            allowed: ['directional_sunlight', 'controlled_soft_key', 'natural_directional'],
            required_direction: 'directional',
            background_exposure: 'muted',       // Subject separated from background
            highlight_on_product: true,
        },

        camera: {
            angle_bias: 'eye_level',            // Eye-level or slightly low
            framing: 'rule_of_thirds',          // Rule-of-thirds framing
            tilt_allowed: false,
            depth_of_field: 'intentional',      // Intentional depth-of-field
        },

        product: {
            min_visibility: 0.7,                // Product visibility ≥ 0.7
            sharpness_priority: 'highest',
            position_rule: 'intersects_natural_body_lines',
            face_relationship: 'secondary',
        },

        color: {
            grade: 'brand_aligned',
            contrast: 'intentional',
            skin_tones: 'natural',
            background_treatment: 'muted',      // Background muted relative to product
        },

        texture: {
            skin: 'preserved',
            allow_asymmetry: false,
            retouch: 'minimal',
        },

        negatives: [
            'no documentary flatness',
            'no street-photo randomness',
            'no equal exposure',
            'no product obscured by pose',
            'no casual snapshot framing',
            'no flat lighting',
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 3: STUDIO_POSTER_AD_V1
    // Bold, clean, graphic product communication
    // ═══════════════════════════════════════════════════════════════════════════════
    STUDIO_POSTER_AD_V1: {
        id: 'STUDIO_POSTER_AD_V1',
        name: 'Studio Poster',
        description: 'Bold, clean graphic product communication',
        icon: 'Image',

        intent: 'Bold, clean, graphic product communication',

        lighting: {
            allowed: ['single_key', 'hard_key', 'studio_dramatic'],
            required_direction: 'single_key',   // Single dominant key
            background_exposure: 'muted',
            highlight_on_product: true,
            fill_ratio: 'minimal',              // Clear shadow logic
        },

        camera: {
            angle_bias: 'neutral_forbidden',    // Neutral is forbidden, must have stance
            framing: 'locked_poster',           // Poster-safe composition
            tilt_allowed: false,                // No tilt
            depth_of_field: 'deep',             // Sharp throughout
        },

        product: {
            min_visibility: 0.8,
            sharpness_priority: 'visual_anchor', // Product is visual anchor
            position_rule: 'center_dominant',
            face_relationship: 'supports_product', // Face supports product, not vice versa
        },

        color: {
            grade: 'high_contrast',
            contrast: 'high',                   // High contrast
            skin_tones: 'rich',
            background_treatment: 'brand_aligned', // Brand color emphasis
        },

        texture: {
            skin: 'highlight_rolloff',
            allow_asymmetry: false,
            retouch: 'editorial',
        },

        negatives: [
            'no lifestyle cues',
            'no candid framing',
            'no soft lighting',
            'no background clutter',
            'no face as primary focus',
            'no documentary style',
        ],
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 4: PREMIUM_EDITORIAL_AD_V1
    // This is where "punch" lives - luxury, authority, magazine-level presence
    // ═══════════════════════════════════════════════════════════════════════════════
    PREMIUM_EDITORIAL_AD_V1: {
        id: 'PREMIUM_EDITORIAL_AD_V1',
        name: 'Premium Editorial',
        description: 'Luxury magazine-level presence',
        icon: 'Sparkles',

        intent: 'Luxury, authority, magazine-level presence',

        lighting: {
            allowed: ['sculpted_key', 'beauty_lighting', 'editorial_dramatic'],
            required_direction: 'sculpted',     // Sculpted key + controlled fill
            background_exposure: 'darker',      // Background intentionally subdued
            highlight_on_product: true,
            fill_ratio: 'controlled',           // Controlled fill
        },

        camera: {
            angle_bias: 'slightly_low',         // Slightly lower than eye-level
            framing: 'editorial_tension',       // Editorial tension in pose
            tilt_allowed: false,
            depth_of_field: 'shallow',          // Selective focus
        },

        product: {
            min_visibility: 0.65,
            sharpness_priority: 'co_hero',      // Product is hero OR co-hero
            position_rule: 'intentional_framing',
            face_relationship: 'co_hero',       // No accidental framing
        },

        color: {
            grade: 'editorial_grade',
            contrast: 'intentional',            // Intentional grade
            skin_tones: 'rich',                 // Rich subject tones
            background_treatment: 'muted',      // Muted background
        },

        texture: {
            skin: 'highlight_rolloff',          // Highlight roll-off on skin
            allow_asymmetry: false,
            retouch: 'editorial',
        },

        negatives: [
            'no casual lighting',
            'no snapshot framing',
            'no flat color',
            'no documentary style',
            'no neutral camera angle',
            'no equal exposure',
            'no product as afterthought',
        ],
    },
    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 5: STREETWEAR_URBAN_AD_V1
    // Gritty, strong shadows, concrete textures
    // ═══════════════════════════════════════════════════════════════════════════════
    STREETWEAR_URBAN_AD_V1: {
        id: 'STREETWEAR_URBAN_AD_V1',
        name: 'Streetwear Urban',
        description: 'Gritty concrete & authenticity',
        icon: 'MapPin',
        intent: 'Gritty, authentic, concrete textures and street credibility',
        lighting: {
            allowed: ['natural_directional', 'hard_key', 'editorial_dramatic'],
            required_direction: 'directional',
            background_exposure: 'equal',
            highlight_on_product: true
        },
        camera: {
            angle_bias: 'low_angle',
            framing: 'mid_full',
            tilt_allowed: true,
            depth_of_field: 'deep'
        },
        product: {
            min_visibility: 0.65,
            sharpness_priority: 'highest',
            position_rule: 'integrated_street',
            face_relationship: 'co_hero'
        },
        color: {
            grade: 'high_contrast',
            contrast: 'high',
            skin_tones: 'natural',
            background_treatment: 'brand_aligned'
        },
        texture: {
            skin: 'natural_texture',
            allow_asymmetry: true,
            retouch: 'minimal'
        },
        negatives: ['no studio lighting', 'no clean background', 'no soft focus', 'no fake smile']
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 6: MINIMALIST_LUXURY_AD_V1
    // Clean, beige, soft shadows
    // ═══════════════════════════════════════════════════════════════════════════════
    MINIMALIST_LUXURY_AD_V1: {
        id: 'MINIMALIST_LUXURY_AD_V1',
        name: 'Minimalist Luxury',
        description: 'Clean, beige, expensive feel',
        icon: 'Diamond',
        intent: 'Clean, beige, soft shadows, and an expensive uncrowded feel',
        lighting: {
            allowed: ['soft_directional_daylight', 'window_light', 'beauty_lighting'],
            required_direction: 'directional',
            background_exposure: 'muted',
            highlight_on_product: true,
            fill_ratio: 'minimal'
        },
        camera: {
            angle_bias: 'eye_level',
            framing: 'rule_of_thirds',
            tilt_allowed: false,
            depth_of_field: 'shallow'
        },
        product: {
            min_visibility: 0.75,
            sharpness_priority: 'visual_anchor',
            position_rule: 'clean_space',
            face_relationship: 'secondary'
        },
        color: {
            grade: 'muted_elegant',
            contrast: 'intentional',
            skin_tones: 'rich',
            background_treatment: 'muted'
        },
        texture: {
            skin: 'highlight_rolloff',
            allow_asymmetry: false,
            retouch: 'editorial'
        },
        negatives: ['no clutter', 'no harsh shadows', 'no bright neon', 'no chaos']
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 7: TECH_FUTURIST_AD_V1
    // Cool tones, metallic, sharp
    // ═══════════════════════════════════════════════════════════════════════════════
    TECH_FUTURIST_AD_V1: {
        id: 'TECH_FUTURIST_AD_V1',
        name: 'Tech Futurist',
        description: 'Cool tones, metallic, sharp',
        icon: 'Cpu',
        intent: 'Cool tones, metallic surfaces, sharp focus, clean lines',
        lighting: {
            allowed: ['studio_dramatic', 'sculpted_key', 'single_key'],
            required_direction: 'single_key',
            background_exposure: 'darker',
            highlight_on_product: true
        },
        camera: {
            angle_bias: 'low_angle',
            framing: 'locked_poster',
            tilt_allowed: false,
            depth_of_field: 'deep'
        },
        product: {
            min_visibility: 0.8,
            sharpness_priority: 'highest',
            position_rule: 'center_dominant',
            face_relationship: 'supports_product'
        },
        color: {
            grade: 'high_contrast',
            contrast: 'high',
            skin_tones: 'natural',
            background_treatment: 'darker'
        },
        texture: {
            skin: 'preserved',
            allow_asymmetry: false,
            retouch: 'minimal'
        },
        negatives: ['no vintage grain', 'no warm tones', 'no organic mess', 'no blur']
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 8: CINEMATIC_DRAMA_AD_V1
    // Moody, shadow-heavy, film noir
    // ═══════════════════════════════════════════════════════════════════════════════
    CINEMATIC_DRAMA_AD_V1: {
        id: 'CINEMATIC_DRAMA_AD_V1',
        name: 'Cinematic Drama',
        description: 'Moody, shadow-heavy noir',
        icon: 'Film',
        intent: 'Moody, shadow-heavy, film noir aesthetic with deep storytelling',
        lighting: {
            allowed: ['editorial_dramatic', 'directional_sunlight', 'hard_key'],
            required_direction: 'sculpted',
            background_exposure: 'darker',
            highlight_on_product: true,
            fill_ratio: 'minimal'
        },
        camera: {
            angle_bias: 'eye_level',
            framing: 'editorial_tension',
            tilt_allowed: false,
            depth_of_field: 'shallow'
        },
        product: {
            min_visibility: 0.6,
            sharpness_priority: 'co_hero',
            position_rule: 'cinematic_framing',
            face_relationship: 'co_hero'
        },
        color: {
            grade: 'editorial_grade',
            contrast: 'high',
            skin_tones: 'rich',
            background_treatment: 'darker'
        },
        texture: {
            skin: 'natural_texture',
            allow_asymmetry: true,
            retouch: 'none'
        },
        negatives: ['no flat lighting', 'no happy commercial smile', 'no bright pop']
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 9: SOFT_PASTEL_AD_V1
    // Daydreamy, bright, low contrast
    // ═══════════════════════════════════════════════════════════════════════════════
    SOFT_PASTEL_AD_V1: {
        id: 'SOFT_PASTEL_AD_V1',
        name: 'Soft Pastel',
        description: 'Daydreamy, bright, airy',
        icon: 'Cloud',
        intent: 'Daydreamy, bright, low contrast, airy atmosphere',
        lighting: {
            allowed: ['soft_pastel', 'window_light', 'controlled_soft_key'],
            required_direction: 'directional',
            background_exposure: 'equal',
            highlight_on_product: true
        },
        camera: {
            angle_bias: 'eye_level',
            framing: 'rule_of_thirds',
            tilt_allowed: true,
            depth_of_field: 'shallow'
        },
        product: {
            min_visibility: 0.7,
            sharpness_priority: 'visual_anchor',
            position_rule: 'soft_center',
            face_relationship: 'co_hero'
        },
        color: {
            grade: 'pastel_grade',
            contrast: 'intentional',
            skin_tones: 'natural',
            background_treatment: 'brand_aligned'
        },
        texture: {
            skin: 'highlight_rolloff',
            allow_asymmetry: false,
            retouch: 'editorial'
        },
        negatives: ['no hard shadows', 'no dark corners', 'no grunge', 'no high contrast']
    },
    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 10: RETRO_FILM_AD_V1
    // Grainy, flash, 90s aesthetic
    // ═══════════════════════════════════════════════════════════════════════════════
    RETRO_FILM_AD_V1: {
        id: 'RETRO_FILM_AD_V1',
        name: 'Retro Film',
        description: 'Grainy 90s flash aesthetic',
        icon: 'Disc',
        intent: 'Grainy, direct flash, 90s analog film aesthetic',
        lighting: {
            allowed: ['hard_key', 'single_key', 'directional_sunlight'],
            required_direction: 'single_key',
            background_exposure: 'muted',
            highlight_on_product: true
        },
        camera: {
            angle_bias: 'neutral_forbidden',
            framing: 'mid_close',
            tilt_allowed: true,
            depth_of_field: 'deep'
        },
        product: {
            min_visibility: 0.7,
            sharpness_priority: 'highest',
            position_rule: 'snapshot_center',
            face_relationship: 'co_hero'
        },
        color: {
            grade: 'retro_film',
            contrast: 'high',
            skin_tones: 'warm_preserved',
            background_treatment: 'darker'
        },
        texture: {
            skin: 'natural_texture',
            allow_asymmetry: true,
            retouch: 'none'
        },
        negatives: ['no clean digital look', 'no perfect lighting', 'no hdr', 'no smooth skin']
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 11: NATURE_ORGANIC_AD_V1
    // Sunlight, plants, earthy tones
    // ═══════════════════════════════════════════════════════════════════════════════
    NATURE_ORGANIC_AD_V1: {
        id: 'NATURE_ORGANIC_AD_V1',
        name: 'Nature Organic',
        description: 'Sunlight, plants, earthy',
        icon: 'Leaf',
        intent: 'Sunlight, plants, earthy tones, organic connection',
        lighting: {
            allowed: ['golden_hour', 'natural_directional', 'soft_directional_daylight'],
            required_direction: 'directional',
            background_exposure: 'equal',
            highlight_on_product: true
        },
        camera: {
            angle_bias: 'slightly_low',
            framing: 'mid_full',
            tilt_allowed: false,
            depth_of_field: 'intentional'
        },
        product: {
            min_visibility: 0.7,
            sharpness_priority: 'highest',
            position_rule: 'organic_placement',
            face_relationship: 'secondary'
        },
        color: {
            grade: 'natural_warm',
            contrast: 'intentional',
            skin_tones: 'natural',
            background_treatment: 'brand_aligned'
        },
        texture: {
            skin: 'natural_texture',
            allow_asymmetry: true,
            retouch: 'minimal'
        },
        negatives: ['no industrial background', 'no studio vibe', 'no cold tones', 'no plastic']
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 12: VIBRANT_POP_AD_V1
    // Saturated, color-blocking, studio fun
    // ═══════════════════════════════════════════════════════════════════════════════
    VIBRANT_POP_AD_V1: {
        id: 'VIBRANT_POP_AD_V1',
        name: 'Vibrant Pop',
        description: 'Saturated, color-blocking',
        icon: 'Zap',
        intent: 'Saturated, color-blocking, studio fun, high energy',
        lighting: {
            allowed: ['hard_key', 'studio_dramatic', 'sculpted_key'],
            required_direction: 'single_key',
            background_exposure: 'equal',
            highlight_on_product: true
        },
        camera: {
            angle_bias: 'eye_level',
            framing: 'mid_shot',
            tilt_allowed: true,
            depth_of_field: 'deep'
        },
        product: {
            min_visibility: 0.85,
            sharpness_priority: 'visual_anchor',
            position_rule: 'pop_center',
            face_relationship: 'co_hero'
        },
        color: {
            grade: 'high_contrast', // proxy for vibrant
            contrast: 'high',
            skin_tones: 'rich',
            background_treatment: 'brand_aligned'
        },
        texture: {
            skin: 'highlight_rolloff',
            allow_asymmetry: false,
            retouch: 'editorial'
        },
        negatives: ['no muted colors', 'no moody shadows', 'no sad vibes', 'no grain']
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 13: DARK_ELEGANCE_AD_V1
    // Low-key, velvet, gold, mysterious
    // ═══════════════════════════════════════════════════════════════════════════════
    DARK_ELEGANCE_AD_V1: {
        id: 'DARK_ELEGANCE_AD_V1',
        name: 'Dark Elegance',
        description: 'Low-key, velvet, gold',
        icon: 'Moon',
        intent: 'Low-key lighting, velvet textures, gold accents, mysterious luxury',
        lighting: {
            allowed: ['sculpted_key', 'single_key', 'editorial_dramatic'],
            required_direction: 'sculpted',
            background_exposure: 'darker',
            highlight_on_product: true
        },
        camera: {
            angle_bias: 'eye_level',
            framing: 'editorial_tension',
            tilt_allowed: false,
            depth_of_field: 'shallow'
        },
        product: {
            min_visibility: 0.7,
            sharpness_priority: 'co_hero',
            position_rule: 'spotlight_focus',
            face_relationship: 'secondary'
        },
        color: {
            grade: 'muted_elegant',
            contrast: 'high',
            skin_tones: 'rich',
            background_treatment: 'darker'
        },
        texture: {
            skin: 'preserved',
            allow_asymmetry: false,
            retouch: 'editorial'
        },
        negatives: ['no bright day', 'no cheerfulness', 'no white background', 'no casual']
    },

    // ═══════════════════════════════════════════════════════════════════════════════
    // PRESET 14: NEON_NOIR_AD_V1
    // Cyberpunk, wet streets, colored gels
    // ═══════════════════════════════════════════════════════════════════════════════
    NEON_NOIR_AD_V1: {
        id: 'NEON_NOIR_AD_V1',
        name: 'Neon Noir',
        description: 'Cyberpunk, wet streets, neon',
        icon: 'BatteryCharging',
        intent: 'Cyberpunk aesthetic, wet streets, colored gels, neon reflections',
        lighting: {
            allowed: ['neon_street', 'editorial_dramatic', 'hard_key'],
            required_direction: 'sculpted',
            background_exposure: 'darker',
            highlight_on_product: true
        },
        camera: {
            angle_bias: 'low_angle',
            framing: 'mid_full',
            tilt_allowed: true,
            depth_of_field: 'intentional'
        },
        product: {
            min_visibility: 0.75,
            sharpness_priority: 'highest',
            position_rule: 'neon_glow_center',
            face_relationship: 'co_hero'
        },
        color: {
            grade: 'neon_grade',
            contrast: 'high',
            skin_tones: 'natural',
            background_treatment: 'darker'
        },
        texture: {
            skin: 'highlight_rolloff',
            allow_asymmetry: true,
            retouch: 'minimal'
        },
        negatives: ['no daylight', 'no warm sun', 'no boring beige', 'no office vibes']
    },
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY PRESET MAPPING
// Maps old preset IDs to new AD-GRADE presets
// ═══════════════════════════════════════════════════════════════════════════════

export const LEGACY_PRESET_MAP: Record<string, PresetId> = {
    // Old IDs → New AD-GRADE IDs
    'UGC_CANDID': 'UGC_CANDID_AD_V1',
    'PRODUCT_LIFESTYLE': 'PRODUCT_LIFESTYLE_AD_V1',
    'STUDIO_POSTER': 'STUDIO_POSTER_AD_V1',
    'PREMIUM_EDITORIAL': 'PREMIUM_EDITORIAL_AD_V1',

    // Also accept new IDs directly
    'UGC_CANDID_AD_V1': 'UGC_CANDID_AD_V1',
    'PRODUCT_LIFESTYLE_AD_V1': 'PRODUCT_LIFESTYLE_AD_V1',
    'STUDIO_POSTER_AD_V1': 'STUDIO_POSTER_AD_V1',
    'PREMIUM_EDITORIAL_AD_V1': 'PREMIUM_EDITORIAL_AD_V1',

    // Map "V1" legacy variations
    'UGC_CANDID_V1': 'UGC_CANDID_AD_V1',
    'PRODUCT_LIFESTYLE_V1': 'PRODUCT_LIFESTYLE_AD_V1',
    'STUDIO_POSTER_V1': 'STUDIO_POSTER_AD_V1',
    'PREMIUM_EDITORIAL_V1': 'PREMIUM_EDITORIAL_AD_V1',
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get preset by ID (handles legacy mapping)
 */
export function getPreset(id: string): AdGradePreset | null {
    const mappedId = LEGACY_PRESET_MAP[id]
    if (!mappedId) return null
    return AD_GRADE_PRESETS[mappedId] || null
}

/**
 * Get all presets as array (for UI)
 */
export function getAllPresets(): AdGradePreset[] {
    return Object.values(AD_GRADE_PRESETS)
}

/**
 * Build preset section for NanoBanana prompt
 */
export function buildPresetPromptSection(preset: AdGradePreset): string {
    const lines: string[] = []

    // INTENT
    lines.push(`INTENT: ${preset.intent}`)
    lines.push('')

    // LIGHTING RULES (assertive, never flat)
    lines.push('LIGHTING RULES:')
    lines.push(`• Direction: ${preset.lighting.required_direction.toUpperCase()} (never flat)`)
    lines.push(`• Background: ${preset.lighting.background_exposure} relative to subject`)
    if (preset.lighting.highlight_on_product) {
        lines.push('• Highlight on product area: REQUIRED')
    }
    if (preset.lighting.fill_ratio) {
        lines.push(`• Fill: ${preset.lighting.fill_ratio}`)
    }
    lines.push('')

    // CAMERA RULES (biased, never neutral)
    lines.push('CAMERA RULES:')
    lines.push(`• Angle: ${preset.camera.angle_bias.replace(/_/g, ' ').toUpperCase()}`)
    lines.push(`• Framing: ${preset.camera.framing.replace(/_/g, ' ')}`)
    lines.push(`• Tilt: ${preset.camera.tilt_allowed ? 'minor allowed' : 'NONE'}`)
    lines.push(`• Depth of field: ${preset.camera.depth_of_field}`)
    lines.push('')

    // PRODUCT RULES (must dominate)
    lines.push('PRODUCT DOMINANCE RULES:')
    lines.push(`• Minimum visibility: ${preset.product.min_visibility * 100}%`)
    lines.push(`• Sharpness: ${preset.product.sharpness_priority.replace(/_/g, ' ').toUpperCase()}`)
    lines.push(`• Position: ${preset.product.position_rule.replace(/_/g, ' ')}`)
    lines.push(`• Face relationship: ${preset.product.face_relationship.replace(/_/g, ' ')}`)
    lines.push('')

    // COLOR RULES (never flat)
    lines.push('COLOR RULES:')
    lines.push(`• Grade: ${preset.color.grade.replace(/_/g, ' ')}`)
    lines.push(`• Contrast: ${preset.color.contrast.toUpperCase()}`)
    lines.push(`• Skin tones: ${preset.color.skin_tones.replace(/_/g, ' ')}`)
    lines.push(`• Background: ${preset.color.background_treatment}`)
    lines.push('')

    // TEXTURE RULES
    lines.push('TEXTURE RULES:')
    lines.push(`• Skin: ${preset.texture.skin.replace(/_/g, ' ')}`)
    lines.push(`• Asymmetry: ${preset.texture.allow_asymmetry ? 'minor allowed' : 'NONE'}`)
    lines.push(`• Retouch: ${preset.texture.retouch}`)
    lines.push('')

    // NEGATIVE CONSTRAINTS (explicit forbidden)
    lines.push('FORBIDDEN (hard negatives):')
    for (const neg of preset.negatives) {
        lines.push(`• ${neg}`)
    }

    return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE PRESET FALLBACK (used when confidence < 60)
// ═══════════════════════════════════════════════════════════════════════════════

export const SAFE_PRESET = {
    preset_id: 'SAFE_FALLBACK',
    lighting: {
        allowed: ['soft_natural', 'window_light', 'soft_directional_daylight'],
        contrast: 'medium',
        temperature: 'neutral',
    },
    camera: {
        device_logic: 'editorial_standard',
        lens_style: '50mm',
    },
    color_palette: 'neutral_brand',
    texture_priority: ['skin', 'fabric', 'product_surface'],
    imperfection_level: 'subtle',
    negative_constraints: [
        'no flat overcast look',
        'no catalog framing',
        'no product blur',
        'no AI-clean plastic skin',
    ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEW-SHOT EXAMPLES FOR GPT-4o-mini
// ═══════════════════════════════════════════════════════════════════════════════

export const FEW_SHOT_EXAMPLES = [
    {
        description: 'UGC Candid ad with floral dress, real influencer, golden hour window setting',
        input: {
            preset: 'UGC_CANDID_AD_V1',
            product_analysis: { type: 'floral_dress', dominant_color: 'blue', texture: 'flowing' },
            influencer_type: 'real',
        },
        output: {
            ad_type: 'ugc_social',
            brand_tier: 'casual',
            subject: {
                type: 'human',
                source: 'real_influencer',
                gender: 'female',
            },
            product: {
                category: 'apparel',
                visibility_score: 0.65,
                logo_visibility: 'subtle',
            },
            pose: {
                allowed_changes: false,
                stance: 'relaxed_standing',
                framing: 'mid_shot',
                camera_angle: 'low_angle',
            },
            environment: {
                type: 'interior',
                background: 'cafe_window',
            },
            lighting: {
                style: 'soft_directional_daylight',
                contrast: 'medium',
                temperature: 'warm',
            },
            camera: {
                device_logic: 'iphone_portrait',
                lens_style: '35mm',
                framing_notes: 'slightly tilted, spontaneous feel',
            },
            texture_priority: ['skin', 'fabric', 'background'],
            color_palette: 'natural_warm',
            imperfections: {
                grain: 'subtle',
                asymmetry: true,
            },
            negative_constraints: [
                'no flat overcast look',
                'no catalog framing',
                'no equal exposure',
                'no neutral angle',
            ],
            confidence_score: 78,
        },
    },
    {
        description: 'Premium Editorial ad with silk blouse, AI influencer, studio setting',
        input: {
            preset: 'PREMIUM_EDITORIAL_AD_V1',
            product_analysis: { type: 'silk_blouse', dominant_color: 'cream', texture: 'luxe' },
            influencer_type: 'ai',
        },
        output: {
            ad_type: 'premium_campaign',
            brand_tier: 'luxury',
            subject: {
                type: 'human',
                source: 'ai_influencer',
                gender: 'female',
            },
            product: {
                category: 'apparel',
                visibility_score: 0.7,
                logo_visibility: 'clear',
            },
            pose: {
                allowed_changes: true,
                stance: 'editorial_tension',
                framing: 'mid_full',
                camera_angle: 'low_angle',
            },
            environment: {
                type: 'studio',
                background: 'minimal',
            },
            lighting: {
                style: 'sculpted_key',
                contrast: 'high',
                temperature: 'neutral',
            },
            camera: {
                device_logic: 'editorial_50-85mm',
                lens_style: '85mm portrait',
                framing_notes: 'magazine-level composition',
            },
            texture_priority: ['fabric', 'skin', 'highlight_rolloff'],
            color_palette: 'editorial_grade',
            imperfections: {
                grain: 'none',
                asymmetry: false,
            },
            negative_constraints: [
                'no casual lighting',
                'no snapshot framing',
                'no flat color',
                'no documentary style',
            ],
            confidence_score: 85,
        },
    },
    {
        description: 'Studio Poster ad with sneakers, AI influencer, bold graphic style',
        input: {
            preset: 'STUDIO_POSTER_AD_V1',
            product_analysis: { type: 'sneakers', dominant_color: 'white_red', texture: 'athletic' },
            influencer_type: 'ai',
        },
        output: {
            ad_type: 'studio_poster',
            brand_tier: 'streetwear',
            subject: {
                type: 'human',
                source: 'ai_influencer',
                gender: 'male',
            },
            product: {
                category: 'footwear',
                visibility_score: 0.85,
                logo_visibility: 'clear',
            },
            pose: {
                allowed_changes: true,
                stance: 'bold_stance',
                framing: 'full_body',
                camera_angle: 'low_angle',
            },
            environment: {
                type: 'studio',
                background: 'clean_solid',
            },
            lighting: {
                style: 'single_key',
                contrast: 'high',
                temperature: 'cool',
            },
            camera: {
                device_logic: 'poster_locked',
                lens_style: '50mm',
                framing_notes: 'poster-safe, product as visual anchor',
            },
            texture_priority: ['product_surface', 'skin', 'background'],
            color_palette: 'high_contrast',
            imperfections: {
                grain: 'none',
                asymmetry: false,
            },
            negative_constraints: [
                'no lifestyle cues',
                'no candid framing',
                'no soft lighting',
                'no face as primary focus',
            ],
            confidence_score: 90,
        },
    },
]

