/**
 * CREATIVE ORCHESTRATOR - TYPE DEFINITIONS
 * 
 * Strict JSON Contract Schema for brand-grade ad generation.
 * This schema is NON-NEGOTIABLE - all outputs from GPT-4o-mini must conform.
 * 
 * "We are not building a prompt generator.
 * We are building a creative decision engine that compiles brand intent,
 * presets, and image analysis into a strict JSON contract for NanoBanana Pro."
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CORE CONTRACT SCHEMA (LOCKED - MATCHES GPT-4O-MINI OUTPUT FORMAT)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreativeContract {
    ad_type: PresetId
    brand_tier: BrandTier

    subject: {
        type: SubjectType
        source: SubjectSource
        influencer_id?: string
        gender?: Gender
    }

    product: {
        category: string
        visibility_score: number  // 0.0-1.0 (>0.7 = product dominates, <0.4 = lifestyle only)
        logo_visibility: LogoVisibility
    }

    pose: {
        allowed_changes: boolean  // FALSE if source='real_influencer', TRUE if source='ai_influencer'
        stance: string
        framing: FramingType
        camera_angle: CameraAngle
    }

    environment: {
        type: string
        background: string
    }

    lighting: {
        style: string
        contrast: ContrastLevel
        temperature: TemperatureLevel
    }

    camera: {
        device_logic: string      // e.g., "iphone flash", "digicam", "editorial 50-85mm"
        lens_style: string        // e.g., "50mm", "35mm wide", "85mm portrait"
        framing_notes: string
    }

    texture_priority: string[]  // e.g., ["skin", "fabric", "product_surface"]
    color_palette: string

    imperfections: {
        grain: GrainLevel
        asymmetry: boolean
    }

    negative_constraints: string[]  // Explicit forbidden artifacts
    confidence_score: number        // 0-100 (if <60, use safe preset)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENUM TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type AdType =
    | 'fashion_editorial'
    | 'ugc_social'
    | 'product_lifestyle'
    | 'studio_poster'
    | 'premium_campaign'

export type BrandTier = 'luxury' | 'premium' | 'casual' | 'streetwear'

export type SubjectType = 'human' | 'product_only'

export type SubjectSource = 'real_influencer' | 'ai_influencer' | 'none'

export type Gender = 'male' | 'female' | 'unisex'

export type LogoVisibility = 'clear' | 'subtle' | 'none'

export type FramingType = 'close_up' | 'mid_shot' | 'mid_full' | 'full_body' | 'wide'

export type CameraAngle = 'eye_level' | 'low_angle' | 'high_angle' | 'dutch_angle'

export type ContrastLevel = 'low' | 'medium' | 'high'

export type TemperatureLevel = 'cool' | 'neutral' | 'warm'

export type GrainLevel = 'none' | 'subtle' | 'visible' | 'heavy'

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface OrchestratorInput {
    // Required
    productImage: string  // base64

    // Optional influencer
    influencerImage?: string  // base64 (real human photo)
    aiInfluencerId?: string   // e.g., "higgsfield_elf_01"

    // Preset selection
    presetId: PresetId

    // User constraints
    constraints?: UserConstraints
}

export interface UserConstraints {
    platform?: 'instagram' | 'facebook' | 'google' | 'tiktok'
    mood?: string
    targetAudience?: string
    productVisibility?: 'dominant' | 'balanced' | 'lifestyle'
    headline?: string
    cta?: string
}

export type PresetId =
    | 'UGC_CANDID_AD_V1'
    | 'PRODUCT_LIFESTYLE_AD_V1'
    | 'STUDIO_POSTER_AD_V1'
    | 'PREMIUM_EDITORIAL_AD_V1'
    | 'STREETWEAR_URBAN_AD_V1'
    | 'MINIMALIST_LUXURY_AD_V1'
    | 'TECH_FUTURIST_AD_V1'
    | 'CINEMATIC_DRAMA_AD_V1'
    | 'SOFT_PASTEL_AD_V1'
    | 'RETRO_FILM_AD_V1'
    | 'NATURE_ORGANIC_AD_V1'
    | 'VIBRANT_POP_AD_V1'
    | 'DARK_ELEGANCE_AD_V1'
    | 'NEON_NOIR_AD_V1'
    // Legacy IDs (mapped internally)
    | 'EDITORIAL_MINIMAL_V1'
    | 'UGC_CANDID_V1'
    | 'PRODUCT_LIFESTYLE_V1'
    | 'STUDIO_POSTER_V1'
    | 'PREMIUM_EDITORIAL_V1'
    | 'STREETWEAR_FLASH_V1'

// ═══════════════════════════════════════════════════════════════════════════════
// AD-GRADE PRESET TYPES (for assertive lighting/camera/product dominance)
// ═══════════════════════════════════════════════════════════════════════════════

export type LightingMode =
    | 'soft_directional_daylight'
    | 'window_light'
    | 'golden_hour'
    | 'directional_sunlight'
    | 'controlled_soft_key'
    | 'natural_directional'
    | 'single_key'
    | 'hard_key'
    | 'studio_dramatic'
    | 'sculpted_key'
    | 'beauty_lighting'
    | 'editorial_dramatic'
    | 'neon_street'
    | 'cinematic_warm'
    | 'bioluminescent'
    | 'soft_pastel'

export type ColorGrade =
    | 'natural_warm'
    | 'brand_aligned'
    | 'high_contrast'
    | 'editorial_grade'
    | 'neon_grade'
    | 'pastel_grade'
    | 'retro_film'
    | 'muted_elegant'

export type TextureMode =
    | 'natural_texture'
    | 'highlight_rolloff'
    | 'preserved'

export type CameraLogic =
    | 'slightly_low'
    | 'eye_level'
    | 'slightly_high'
    | 'neutral_forbidden'

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGE ANALYSIS TYPES (from GPT-4o-mini vision)
// ═══════════════════════════════════════════════════════════════════════════════

export interface ImageAnalysisResult {
    product: ProductAnalysis
    influencer?: InfluencerAnalysis
}

export interface ProductAnalysis {
    category: string           // e.g., "apparel", "accessory", "footwear"
    subcategory: string        // e.g., "t-shirt", "sneakers", "handbag"
    colors: string[]
    textures: string[]         // e.g., ["cotton", "ribbed", "matte"]
    keyFeatures: string[]      // e.g., ["logo print", "oversized fit"]
    brandSignals: string[]     // e.g., ["minimal", "luxury", "streetwear"]
}

export interface InfluencerAnalysis {
    source: SubjectSource      // 'real_influencer' or 'ai_influencer'
    gender: Gender
    poseDescription: string
    expression: string
    lightingFamily: string     // e.g., "soft daylight", "studio flash"
    cameraLogic: string        // e.g., "iphone portrait", "editorial 85mm"
    eraSignals: string[]       // e.g., ["Y2K", "contemporary editorial"]
    // AI / Generated fields
    styleTags?: string[]
    visualDescription?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export class ContractValidationError extends Error {
    constructor(
        message: string,
        public details?: unknown
    ) {
        super(message)
        this.name = 'ContractValidationError'
    }
}

export class LowConfidenceError extends Error {
    constructor(
        message: string,
        public confidenceScore: number,
        public suggestedAction: 'use_safe_preset' | 'ask_user'
    ) {
        super(message)
        this.name = 'LowConfidenceError'
    }
}

export class ImageAnalysisError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'ImageAnalysisError'
    }
}
