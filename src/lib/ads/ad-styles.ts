/**
 * AD STYLE PRESETS
 * 
 * Locked preset system for ad generation.
 * Brands select from these presets only — no custom prompts allowed.
 * 
 * Flow: JSON input → prompt template → image model
 */

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type AdPresetId = 'UGC_CANDID' | 'PRODUCT_LIFESTYLE' | 'STUDIO_POSTER' | 'PREMIUM_EDITORIAL'

export type Platform = 'instagram' | 'facebook' | 'google' | 'influencer'

export type CaptionTone = 'casual' | 'premium' | 'confident'

export type CtaType = 'shop_now' | 'learn_more' | 'explore' | 'buy_now'

export interface AdPreset {
    id: AdPresetId
    name: string
    description: string
    icon: string // Lucide icon name
    whenToUse: string[]
    platforms: Platform[]
}

export interface AdGenerationInput {
    preset: AdPresetId
    campaignId?: string

    // Image inputs
    productImage?: string // base64
    influencerImage?: string // base64
    lockFaceIdentity?: boolean

    // Text controls
    headline?: string // max 6 words
    ctaType: CtaType
    captionTone?: CaptionTone

    // Platform selection
    platforms: Platform[]

    // Subject overrides (optional)
    subject?: {
        gender?: 'male' | 'female' | 'unisex'
        ageRange?: string
        pose?: string
        expression?: string
    }
}

// ═══════════════════════════════════════════════════════════════
// PRESET DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const AD_PRESETS: AdPreset[] = [
    {
        id: 'UGC_CANDID',
        name: 'UGC Candid',
        description: 'Authentic user-generated content feel',
        icon: 'Camera',
        whenToUse: ['Instagram ads', 'Influencer-style content', 'Casual brands'],
        platforms: ['instagram', 'facebook'],
    },
    {
        id: 'PRODUCT_LIFESTYLE',
        name: 'Product Lifestyle',
        description: 'Product in a natural real-world setting',
        icon: 'ShoppingBag',
        whenToUse: ['D2C brands', 'Catalog ads', 'Product clarity matters'],
        platforms: ['instagram', 'google'],
    },
    {
        id: 'STUDIO_POSTER',
        name: 'Studio Poster',
        description: 'Clean, focused studio aesthetic',
        icon: 'Image',
        whenToUse: ['Sales', 'Announcements', 'Brand drops'],
        platforms: ['instagram', 'facebook', 'google'],
    },
    {
        id: 'PREMIUM_EDITORIAL',
        name: 'Premium Editorial',
        description: 'Magazine-quality editorial look',
        icon: 'Sparkles',
        whenToUse: ['Brand campaigns', 'High-end brands', 'Storytelling'],
        platforms: ['instagram'],
    },
]

// ═══════════════════════════════════════════════════════════════
// PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════════

const SAFETY_SUFFIX = `
No surreal elements, no fantasy effects, no glitch art, no collage, no duplicated features, no floating objects, no exaggerated anatomy, no body distortion, no extra text, no logos, no watermarks, no unrealistic lighting, no painterly or illustrated style. Photorealistic commercial photography only.`

const PROMPT_TEMPLATES: Record<AdPresetId, (input: AdGenerationInput) => string> = {
    UGC_CANDID: (input) => {
        const gender = input.subject?.gender === 'male' ? 'man' : 'woman'
        const age = input.subject?.ageRange || '22-30'
        const pose = input.subject?.pose || 'relaxed standing'
        const expression = input.subject?.expression || 'natural, confident'

        return `A naturally posed young ${gender} captured in a casual, candid moment, ${pose} with relaxed posture and a ${expression} expression. Their body proportions, facial structure, and pose remain fully realistic and anatomically correct.

They are wearing the featured apparel clearly and naturally as part of their outfit, with accurate fabric drape, natural wrinkles, and true-to-life texture. The product remains the visual focus without appearing staged or exaggerated.

The scene takes place in a real urban environment, such as a sidewalk or simple indoor room, with authentic textures like concrete, walls, or furniture subtly present in the background. The environment supports the subject without drawing attention away from them.

Lighting is soft natural daylight, evenly illuminating the subject with gentle shadows that match the environment. Skin texture, fabric fibers, and material details are clearly visible without smoothing or artificial enhancement.

Captured using a realistic smartphone-style camera perspective, equivalent to a 35mm lens, with slightly off-center framing and shallow depth of field typical of real social media photos.

The overall mood is casual, relatable, and authentic, resembling a real user-generated photo taken spontaneously for social media.
${SAFETY_SUFFIX}`
    },

    PRODUCT_LIFESTYLE: (input) => {
        const hasModel = !!input.influencerImage
        const modelText = hasModel
            ? 'If a model is present, they are posed naturally and proportionally, without dramatic gestures or exaggerated expressions.'
            : ''

        return `A clean, professional lifestyle product photograph featuring the product as the primary visual focus. ${modelText}

The product is displayed clearly with accurate color, scale, and texture, showing realistic fabric weave, stitching, and material behavior. No distortion or stylization is applied to the product.

The environment is a simple, modern lifestyle setting such as a minimal room or neutral interior, carefully composed to complement the product without clutter or distraction.

Lighting is soft studio or diffused natural light, evenly distributed to avoid harsh shadows while preserving depth and realism. Subtle shadows fall naturally beneath the subject and product.

Captured with a professional camera perspective equivalent to a 50mm lens, framed cleanly to prioritize product visibility and commercial clarity.

The overall aesthetic is polished, trustworthy, and suitable for ecommerce and paid advertising.
${SAFETY_SUFFIX}`
    },

    STUDIO_POSTER: (input) => {
        const pose = input.subject?.pose || 'simple confident stance'

        return `A clean studio-style advertising image featuring a single subject posed confidently with ${pose} and natural posture and balanced proportions. The subject is centered clearly within the frame for strong visual impact.

The background is a simple solid or soft gradient studio backdrop with no texture or distractions, designed to leave clear space for text placement.

Lighting is controlled studio lighting using softboxes, producing even illumination with gentle shadows and strong clarity on the subject and product.

Captured with a straight-on camera angle equivalent to a 50mm lens, maintaining symmetry and clarity suitable for poster-style advertising.

The overall style is bold, minimal, and commercial, optimized for high readability and visual clarity in paid advertisements.
${SAFETY_SUFFIX}`
    },

    PREMIUM_EDITORIAL: (input) => {
        const expression = input.subject?.expression || 'composed, confident'

        return `A high-end editorial fashion photograph featuring a subject with composed posture and a ${expression} expression. Facial features, body proportions, and pose remain fully realistic and natural.

The subject is placed within a carefully chosen real-world environment, such as an architectural interior or minimal outdoor setting, adding depth and narrative without overwhelming the composition.

Lighting is cinematic yet realistic, using directional light to create soft highlights and natural shadows that sculpt the subject while preserving realism.

Captured with a professional camera perspective equivalent to a 50mm or 85mm lens, offering shallow depth of field and refined composition typical of premium fashion editorials.

Textures such as skin, fabric, leather, and environmental materials are clearly visible, with subtle grain allowed only to enhance realism.

The overall mood is refined, premium, and brand-forward, suitable for luxury advertising campaigns.
${SAFETY_SUFFIX}`
    },
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getAdPreset(id: AdPresetId): AdPreset | undefined {
    return AD_PRESETS.find(p => p.id === id)
}

export function getAdPresetList(): AdPreset[] {
    return AD_PRESETS
}

export function generateAdPrompt(input: AdGenerationInput): string {
    const template = PROMPT_TEMPLATES[input.preset]
    if (!template) {
        throw new Error(`Unknown preset: ${input.preset}`)
    }
    return template(input)
}

export function validateAdInput(input: AdGenerationInput): { valid: boolean; error?: string } {
    // Validate preset
    if (!AD_PRESETS.find(p => p.id === input.preset)) {
        return { valid: false, error: 'Invalid preset selected' }
    }

    // Validate headline (max 6 words)
    if (input.headline) {
        const wordCount = input.headline.trim().split(/\s+/).length
        if (wordCount > 6) {
            return { valid: false, error: 'Headline cannot exceed 6 words' }
        }
    }

    // Validate platforms
    if (!input.platforms || input.platforms.length === 0) {
        return { valid: false, error: 'At least one platform must be selected' }
    }

    // Validate CTA
    const validCtas: CtaType[] = ['shop_now', 'learn_more', 'explore', 'buy_now']
    if (!validCtas.includes(input.ctaType)) {
        return { valid: false, error: 'Invalid CTA type' }
    }

    return { valid: true }
}

// ═══════════════════════════════════════════════════════════════
// CTA & TONE DISPLAY HELPERS
// ═══════════════════════════════════════════════════════════════

export const CTA_OPTIONS: { value: CtaType; label: string }[] = [
    { value: 'shop_now', label: 'Shop Now' },
    { value: 'learn_more', label: 'Learn More' },
    { value: 'explore', label: 'Explore' },
    { value: 'buy_now', label: 'Buy Now' },
]

export const TONE_OPTIONS: { value: CaptionTone; label: string }[] = [
    { value: 'casual', label: 'Casual' },
    { value: 'premium', label: 'Premium' },
    { value: 'confident', label: 'Confident' },
]

export const PLATFORM_OPTIONS: { value: Platform; label: string; icon: string }[] = [
    { value: 'instagram', label: 'Instagram', icon: 'Instagram' },
    { value: 'facebook', label: 'Facebook', icon: 'Facebook' },
    { value: 'google', label: 'Google Ads', icon: 'Globe' },
    { value: 'influencer', label: 'Influencer', icon: 'Users' },
]
