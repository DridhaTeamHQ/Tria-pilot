/**
 * CREATIVE ORCHESTRATOR - NANOBANANA RENDER
 * 
 * Converts validated Creative Contract into NanoBanana Pro image.
 * 
 * CRITICAL: This layer outputs prompts in the FINE-TUNED MODEL'S LANGUAGE.
 * The model was trained on flowing prose with:
 * - Embedded texture calls ("skin pores", "fabric weaves")
 * - Cinematic camera descriptions ("50mm focal balance", "handheld tilt")
 * - Lighting woven into scene descriptions
 * - Style tags at end ("—high-fashion editorial, hyper-real texture fidelity")
 * 
 * NOT structured sections. PROSE that the model recognizes.
 */

import { generateTryOn, type TryOnOptions } from '@/lib/nanobanana'
import type { CreativeContract } from './types'
import { getPreset, type AdGradePreset } from './presets'
import { generateCreativePrompt } from './prompt_writer'

// ═══════════════════════════════════════════════════════════════════════════════
// STYLE TAG MAPPING (based on fine-tuned training data)
// ═══════════════════════════════════════════════════════════════════════════════

const STYLE_NARRATIVES: Record<string, string> = {
    'UGC_CANDID_AD_V1': 'The image mimics a candid smartphone snapshot with spontaneous intimacy and natural imperfections.',
    'PRODUCT_LIFESTYLE_AD_V1': 'The scene is a high-quality lifestyle editorial, focusing on natural texture fidelity and authentic use context.',
    'STUDIO_POSTER_AD_V1': 'The image is a high-fashion studio editorial with hyper-real texture fidelity and dramatic, controlled lighting.',
    'PREMIUM_EDITORIAL_AD_V1': 'The aesthetic is premium editorial, featuring sophisticated styling and exquisite attention to material detail.',
    'STREETWEAR_URBAN_AD_V1': 'The photograph captures a raw urban streetwear aesthetic, emphasizing gritty textures and authentic street credibility.',
    'MINIMALIST_LUXURY_AD_V1': 'The composition is minimalist and architectural, using a palette of beige tones to convey high-end commercial luxury.',
    'TECH_FUTURIST_AD_V1': 'The visual style is futuristic tech, characterized by cold lighting, sharp metallic textures, and a sleek, modern atmosphere.',
    'CINEMATIC_DRAMA_AD_V1': 'The image evokes a cinematic film noir atmosphere with deep shadows, moody lighting, and a strong sense of narrative drama.',
    'SOFT_PASTEL_AD_V1': 'The lighting is soft and dreamy, creating an airy pastel aesthetic with gentle, diffused illumination.',
    'RETRO_FILM_AD_V1': 'The photo mimics 90s flash photography with analog film grain and a vintage, nostalgic aesthetic.',
    'NATURE_ORGANIC_AD_V1': 'The scene is sun-drenched and organic, emphasizing earthy tones and a deep connection to the natural world.',
    'VIBRANT_POP_AD_V1': 'The image is a vibrant pop art commercial, featuring high saturation color blocking and bold, energetic visuals.',
    'DARK_ELEGANCE_AD_V1': 'The aesthetic is luxury dark mode, featuring velvet textures, gold accents, and an air of mysterious elegance.',
    'NEON_NOIR_AD_V1': 'The scene is a cyberpunk night, illuminated by wet street reflections and vibrant neon lighting for a cinematic noir feel.',
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIGHTING PROSE FRAGMENTS (from training data patterns)
// ═══════════════════════════════════════════════════════════════════════════════

const LIGHTING_PROSE: Record<string, string[]> = {
    'soft_directional_daylight': [
        'soft directional daylight slices diagonally',
        'natural late morning sunlight gently bathes the scene',
        'warm, nuanced highlights and subtle shadows',
    ],
    'golden_hour': [
        'golden low sun bathes every detail in warm, natural glow',
        'sun-washed amber leaks through',
        'late afternoon sun filters through, suffusing with deep amber and golden-hour saffron hues',
    ],
    'window_light': [
        'natural light filters softly through windows',
        'ambient natural daylight filters through diffuse windows casting soft, natural shadows',
    ],
    'sculpted_key': [
        'sculpted key light with controlled fill',
        'the spotlight casts a crisp pool of pale light',
        'a single dominant key light carves the scene',
    ],
    'single_key': [
        'under a solitary, crisp-edged spotlight casting a cool, silver glow',
        'harsh studio lights casting subtle shadows',
        'stark studio setting with bursts of color from neon gels',
    ],
    'flash': [
        'direct flash creates harsh, high-contrast shadows',
        'frontal flash illumination typical of snapshot photography',
    ],
    'neon_street': [
        'neon signs cast vibrant, multicolored reflections on wet surfaces',
        'cool cyan and magenta street lights cut through the darkness',
        'electric blue and neon pink highlights rim the subject'
    ],
    'soft_pastel': [
        'diffused, omni-directional light eliminates all harsh shadows',
        'creamy, soft light bathes the scene in low-contrast pastels',
        'airy, high-key lighting with no true blacks'
    ],
    'bioluminescent': [
        'ethereal, internal glow illuminates from within',
        'otherworldly, alien light sources cast strange, beautiful shadows',
        'subtle, phosphorescent lighting in deep blues and greens'
    ],
    'cinematic_warm': [
        'deep, tungsten-balanced practical lights create a moody warmth',
        'cinematic, low-key lighting with rich, warm highlights',
        'golden light spills from practical sources in a dark room'
    ],
    'editorial_dramatic': [
        'high-drama fashion lighting with deep blacks and sharp highlights',
        'intense, controlled lighting shaping the form with precision',
        'the light falls with painterly intent, leaving half the scene in shadow'
    ],

}

// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA PROSE FRAGMENTS (from training data patterns)
// ═══════════════════════════════════════════════════════════════════════════════

const CAMERA_PROSE: Record<string, string[]> = {
    'slightly_low': [
        'the camera sits low and moderately close',
        'framed from a low angle with a 50mm lens',
        'shot from an eye-level 50mm perspective, the composition centers slightly off-axis',
    ],
    'eye_level': [
        'the camera\'s eye-level 50mm lens captures this moment with measured intimacy',
        'eye-level shot capturing the subject with clean lines',
    ],
    'handheld_tilt': [
        'the framing is slightly tilted, emphasizing spontaneous intimacy',
        'a slight handheld tilt adds to the tension',
        'composition uses creative framing with slightly off-center balance',
    ],
    'locked_poster': [
        'the lens hovers at eye-level with a 50mm focal balance',
        'locked framing with no tilt, poster-safe composition',
    ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXTURE PROSE FRAGMENTS (embedded in training data)
// ═══════════════════════════════════════════════════════════════════════════════

const TEXTURE_CALLS = [
    'visible skin pores and natural blemishes',
    'subtle skin textures and fine wrinkles',
    'skin pores and fine vellus hairs rendered in unflinching close-up',
    'the weave of the fabric swelling against the curve',
    'tactile textures of worn cotton and natural creases',
    'detailed fabric grain and individual hair strands',
    'realistic strand details and natural fabric folds',
]

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Render ad image using NanoBanana Pro with Creative Contract constraints.
 * Outputs prompt in FINE-TUNED MODEL LANGUAGE (flowing prose + style tags).
 */
export async function renderWithNanoBanana(
    contract: CreativeContract,
    productImage: string,
    influencerImage?: string
): Promise<string> {
    console.log('[Render] Starting NanoBanana render with contract:', contract.ad_type)

    // Get the AD-GRADE preset for additional context
    const preset = getPreset(contract.ad_type)
    if (!preset) throw new Error(`Preset not found: ${contract.ad_type}`)

    // 1. GENERATE CREATIVE PROMPT (AI Writer)
    // Replaces deterministic template with GPT-4o-mini narrative
    const prosePrompt = await generateCreativePrompt(contract, preset)

    // Determine model based on contract complexity
    const model = selectModel(contract)

    // Build TryOnOptions
    const options: TryOnOptions = {
        personImage: influencerImage || productImage,
        clothingImage: productImage,
        prompt: prosePrompt,
        model,
        aspectRatio: selectAspectRatio(contract),
        resolution: '2K',
        sceneDescription: formatSceneForModel(contract),
        lightingDescription: formatLightingForModel(contract, preset),
        garmentDescription: `${contract.product.category} worn prominently`,
    }

    console.log('[Render] Fine-tuned prompt length:', prosePrompt.length)
    console.log('[Render] Style narrative:', STYLE_NARRATIVES[contract.ad_type] || 'default')

    try {
        const generatedImage = await generateTryOn(options)
        console.log('[Render] NanoBanana render complete')
        return generatedImage
    } catch (error) {
        console.error('[Render] NanoBanana render failed:', error)
        throw error
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARAGRAPH BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function buildSceneParagraph(contract: CreativeContract): string {
    const parts: string[] = []

    // Opening with environment context
    const envType = contract.environment.type
    const bgType = contract.environment.background

    if (envType === 'studio') {
        parts.push(`Against a ${bgType} studio backdrop`)
    } else if (envType === 'outdoor') {
        parts.push(`In a candid ${bgType} setting`)
    } else {
        parts.push(`Within a ${bgType} ${envType} space`)
    }

    // Subject description
    if (contract.subject.type === 'human') {
        const gender = contract.subject.gender || 'person'
        const source = contract.subject.source === 'real_influencer' ? 'the model' : 'a stylish figure'
        parts.push(`${source} stands with ${contract.pose.stance.replace(/_/g, ' ')} posture`)
    }

    // Product visibility (woven in, not stated as rule)
    const productCategory = contract.product.category
    const visibilityScore = contract.product.visibility_score

    if (visibilityScore >= 0.7) {
        parts.push(`wearing a prominently displayed ${productCategory} that commands visual attention`)
    } else if (visibilityScore >= 0.4) {
        parts.push(`styled with a ${productCategory} that integrates naturally into the composition`)
    } else {
        parts.push(`with ${productCategory} subtly present in the frame`)
    }

    // Clothing/product texture call
    parts.push(`the fabric's texture catching light with subtle definition`)

    return parts.join(', ') + '.'
}

function buildLightingParagraph(contract: CreativeContract, preset: AdGradePreset | null): string {
    const parts: string[] = []

    // Get lighting description from training data patterns
    const lightingStyle = contract.lighting.style.toLowerCase()
    let lightingProse = ''

    // Match to fine-tuned lighting patterns
    if (lightingStyle.includes('directional') || lightingStyle.includes('soft')) {
        const options = LIGHTING_PROSE['soft_directional_daylight']
        lightingProse = options[Math.floor(Math.random() * options.length)]
    } else if (lightingStyle.includes('golden') || lightingStyle.includes('warm')) {
        const options = LIGHTING_PROSE['golden_hour']
        lightingProse = options[Math.floor(Math.random() * options.length)]
    } else if (lightingStyle.includes('studio') || lightingStyle.includes('key')) {
        const options = LIGHTING_PROSE['sculpted_key']
        lightingProse = options[Math.floor(Math.random() * options.length)]
    } else if (lightingStyle.includes('flash')) {
        const options = LIGHTING_PROSE['flash']
        lightingProse = options[Math.floor(Math.random() * options.length)]
    } else {
        lightingProse = 'natural light gently illuminates the scene'
    }

    parts.push(lightingProse)

    // Contrast description
    const contrast = contract.lighting.contrast
    if (contrast === 'high') {
        parts.push('carving deep shadows that define the form')
    } else if (contrast === 'medium') {
        parts.push('creating natural shadows that enhance depth')
    } else {
        parts.push('with soft shadows that maintain detail')
    }

    // Temperature
    const temp = contract.lighting.temperature
    if (temp === 'warm') {
        parts.push('warm tones suffuse the scene')
    } else if (temp === 'cool') {
        parts.push('cool tones lend a modern edge')
    }

    // Product highlight (from preset rules)
    if (preset?.lighting.highlight_on_product) {
        parts.push('with a subtle highlight drawing attention to the product')
    }

    return parts.join(', ') + '.'
}

function buildCameraParagraph(contract: CreativeContract): string {
    const parts: string[] = []

    // Camera angle prose
    const angle = contract.pose.camera_angle
    let cameraProse = ''

    if (angle.includes('low') || angle === 'low_angle') {
        const options = CAMERA_PROSE['slightly_low']
        cameraProse = options[Math.floor(Math.random() * options.length)]
    } else if (angle.includes('eye') || angle === 'eye_level') {
        const options = CAMERA_PROSE['eye_level']
        cameraProse = options[Math.floor(Math.random() * options.length)]
    } else {
        cameraProse = 'the frame captures the scene with intentional composition'
    }

    parts.push(cameraProse)

    // Framing
    const framing = contract.pose.framing
    if (framing === 'mid_shot' || framing === 'close_up') {
        parts.push('the tight framing emphasizes intimate detail')
    } else if (framing === 'full_body') {
        parts.push('the full-body framing grounds the subject in the environment')
    } else {
        parts.push('balanced framing maintains visual hierarchy')
    }

    // Texture calls (CRITICAL for fine-tuned model)
    const randomTexture = TEXTURE_CALLS[Math.floor(Math.random() * TEXTURE_CALLS.length)]
    parts.push(randomTexture)

    // Imperfections (per contract)
    if (contract.imperfections.asymmetry) {
        parts.push('with minor natural asymmetry')
    }
    if (contract.imperfections.grain && contract.imperfections.grain !== 'none') {
        parts.push(`subtle ${contract.imperfections.grain} grain adds authenticity`)
    }

    return parts.join(', ') + '.'
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatSceneForModel(contract: CreativeContract): string {
    return `${contract.environment.type} with ${contract.environment.background} background, ${contract.lighting.temperature} tones`
}

function formatLightingForModel(contract: CreativeContract, preset: AdGradePreset | null): string {
    const base = `${contract.lighting.style} lighting, ${contract.lighting.contrast} contrast`
    if (preset?.lighting.required_direction) {
        return `${base}, ${preset.lighting.required_direction} direction`
    }
    return base
}

function selectModel(contract: CreativeContract): TryOnOptions['model'] {
    // Use Pro model for:
    // - Premium/luxury tier
    // - High confidence contracts
    // - Real influencer (needs precise face handling)
    if (
        contract.brand_tier === 'luxury' ||
        contract.confidence_score >= 85 ||
        contract.subject.source === 'real_influencer'
    ) {
        return 'gemini-3-pro-image-preview'
    }

    return 'gemini-2.5-flash-image'
}

function selectAspectRatio(contract: CreativeContract): TryOnOptions['aspectRatio'] {
    switch (contract.pose.framing) {
        case 'close_up':
            return '1:1'
        case 'mid_shot':
        case 'mid_full':
            return '4:5'  // Instagram optimal
        case 'full_body':
            return '2:3'
        case 'wide':
            return '16:9'
        default:
            return '4:5'
    }
}
