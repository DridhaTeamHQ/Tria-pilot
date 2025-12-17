import { GoogleGenAI, type ContentListUnion, type GenerateContentConfig, type ImageConfig } from '@google/genai'
import { getGeminiKey } from '@/lib/config/api-keys'

const getClient = () => new GoogleGenAI({ apiKey: getGeminiKey() })

function stripDataUrl(base64: string): string {
  return (base64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

function normalizeAspectRatio(ratio: string | undefined): string {
  const raw = String(ratio || '').trim()
  if (!raw) return '3:4'
  const allowed = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'])
  if (allowed.has(raw)) return raw
  if (raw === '4:5') return '3:4'
  if (raw === '5:4') return '4:3'
  return '3:4'
}

export interface SimpleRenderOptions {
  subjectImageBase64: string
  garmentImageBase64: string
  backgroundInstruction: string
  lightingInstruction: string
  quality: 'fast' | 'high'
  aspectRatio?: string
  resolution?: string
  stylePresetId?: string
}

/**
 * SCENE PRESETS - Indian-focused with sharp backgrounds
 */
const SCENE_PRESETS: Record<string, {
  scene: string
  lighting: string
  camera: string
  texture: string
  style: string
}> = {
  keep_original: {
    scene: '',
    lighting: '',
    camera: '',
    texture: '',
    style: '',
  },
  studio_white: {
    scene: 'a real photography studio with white paper backdrop showing slight creases and shadows where it curves',
    lighting: 'professional soft lighting with subtle shadows under chin and on backdrop, not perfectly flat',
    camera: '85mm portrait lens with natural bokeh, slight softness at edges, centered composition',
    texture: 'visible skin pores, fabric weave details, paper backdrop texture with minor wrinkles',
    style: 'professional fashion photo with authentic studio feel, slight film grain',
  },
  studio_grey: {
    scene: 'a photography studio with grey fabric backdrop showing natural fabric texture and minor folds',
    lighting: 'controlled but natural-looking studio lighting, gentle shadows defining face structure',
    camera: '50mm at eye level, natural depth of field, subject sharp against textured backdrop',
    texture: 'visible skin texture, fabric grain on both clothing and backdrop, natural imperfections',
    style: 'editorial portrait with real photography aesthetic, not CGI-perfect',
  },
  outdoor_natural: {
    scene: 'a real garden with slightly overgrown tropical plants, weathered garden path, fallen leaves on ground, imperfect greenery',
    lighting: 'natural uneven sunlight through leaves creating dappled shadows, not perfectly even',
    camera: 'candid iPhone shot with natural depth, slight motion in hair or fabric',
    texture: 'worn stone path, wilting flower edges, dusty leaf surfaces, natural grass patches',
    style: 'authentic candid snapshot taken by friend, not posed studio shot',
  },
  outdoor_golden: {
    scene: 'a weathered rooftop terrace at sunset with old potted plants, worn tiles, rusty railing, lived-in feel',
    lighting: 'warm golden hour with harsh sun flare, uneven shadows, natural lens warmth',
    camera: 'handheld phone shot with slight tilt, background in focus with atmospheric haze',
    texture: 'sun-weathered surfaces, dusty floor, warm skin glow with visible pores',
    style: 'spontaneous golden hour snapshot, authentic travel photo aesthetic',
  },
  outdoor_beach: {
    scene: 'a real beach with uneven wet sand, seaweed, footprints, weathered palm trees with brown fronds, visible beach debris',
    lighting: 'bright coastal sun with glare on water, natural harsh shadows, not studio-lit',
    camera: 'candid beach snapshot angle, water splashing near feet, wind in hair',
    texture: 'grainy sand texture, salt spray on skin, wet footprints, weathered bark on palms',
    style: 'authentic vacation photo taken on phone, not professional shoot',
  },
  street_city: {
    scene: 'a busy Indian city street with worn painted buildings, peeling posters, parked scooters, tangled wires overhead, stray dogs',
    lighting: 'harsh midday sun with strong shadows, natural urban lighting with dust particles',
    camera: 'candid street shot from slight distance, handheld with minor motion blur',
    texture: 'cracked pavement, faded paint, dusty surfaces, real urban grit',
    style: 'authentic street photography, documentary candid style, not posed',
  },
  street_cafe: {
    scene: 'a cozy Indian café with mismatched wooden chairs, chipped tables, plants in old tins, fairy lights, coffee stains',
    lighting: 'warm ambient bulb light mixed with daylight from windows, uneven shadows',
    camera: 'casual phone snapshot from across table, slightly off-center framing',
    texture: 'worn wood grain, scratched table surface, condensation on glass, fabric wrinkles',
    style: 'authentic café snapshot taken by friend, Instagram casual',
  },
  lifestyle_home: {
    scene: 'a real Indian apartment with lived-in feel, some clutter visible, sunlight through curtains, family photos',
    lighting: 'natural window light with dust motes, warm afternoon glow, uneven brightness',
    camera: 'casual home photo angle, slightly tilted iPhone shot',
    texture: 'worn sofa fabric, dusty shelves, rumpled curtains, natural home imperfections',
    style: 'authentic home photo, real life not staged',
  },
  lifestyle_office: {
    scene: 'a real office with papers on desk, monitor screens, water bottles, cables visible, plant needing water',
    lighting: 'harsh fluorescent mixed with window light, typical office lighting',
    camera: 'candid office snapshot, colleague taking photo',
    texture: 'keyboard dust, desk clutter, wrinkled documents, real office environment',
    style: 'authentic workplace photo, LinkedIn casual',
  },
  editorial_minimal: {
    scene: 'a minimal concrete space with textured walls, some wall cracks, uneven floor, industrial elements',
    lighting: 'dramatic harsh directional light creating deep shadows, visible light source',
    camera: 'fashion editorial angle, deliberate composition with negative space',
    texture: 'raw concrete texture, visible wall imperfections, natural skin pores and texture',
    style: 'high-fashion editorial with raw aesthetic, not overly polished',
  },
}

/**
 * PRO & FLASH - Ultra simple prompts
 * Complex prompts were confusing the model
 */
function buildProPrompt(keepBg: boolean, preset: any, backgroundInstruction: string, lightingInstruction: string): string {
  // CLOTHING ONLY / KEEP ORIGINAL - must CHANGE the clothes
  if (keepBg) {
    return `REPLACE the clothing on this person.

Image 1: A person wearing some clothes
Image 2: NEW clothing item (this is what they should wear)

Task: REMOVE the clothes the person is currently wearing and DRESS them in the clothing from image 2.

The person in the output must be wearing the outfit from IMAGE 2, not their original outfit.

Keep same: face, body, hair, background, pose
CHANGE: Their clothes - they must now wear the outfit shown in image 2`
  }
  
  if (preset?.scene) {
    return `Show this same woman wearing the outfit from image 2 in ${preset.scene}. Her face must be identical to image 1. Realistic photo.`
  }
  
  return `This woman wearing the clothes from image 2. Scene: ${backgroundInstruction}. Keep her face the same as image 1.`
}

/**
 * ============================================
 * FLASH MODEL PROMPTS (gemini-2.5-flash-image)
 * - Simple, direct instructions
 * - Focus on essential rules only
 * - Higher temperature for creativity
 * ============================================
 */
function buildFlashPrompt(keepBg: boolean, preset: any, backgroundInstruction: string, lightingInstruction: string): string {
  // Use SAME prompt style as Pro (which works)
  if (keepBg) {
    return `REPLACE the clothing on this person.

Image 1: A person wearing some clothes
Image 2: NEW clothing item (this is what they should wear)

Task: REMOVE the clothes the person is currently wearing and DRESS them in the clothing from image 2.

The person in the output must be wearing the outfit from IMAGE 2, not their original outfit.

Keep same: face, body, hair, background, pose
CHANGE: Their clothes - they must now wear the outfit shown in image 2`
  }
  
  if (preset?.scene) {
    return `Show this person wearing the outfit from image 2 in ${preset.scene}. Same face as image 1. Change clothes to image 2.`
  }
  
  return `Show this person wearing the clothes from image 2. Scene: ${backgroundInstruction}. Change their outfit to match image 2.`
}

/**
 * RENDERER - Separate strategies for Flash vs Pro
 */
export async function renderTryOnFast(params: SimpleRenderOptions): Promise<string> {
  const {
    subjectImageBase64,
    garmentImageBase64,
    backgroundInstruction,
    lightingInstruction,
    quality,
    aspectRatio: userAspect,
    resolution,
    stylePresetId,
  } = params

  const client = getClient()
  const isPro = quality === 'high'
  const model = isPro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image'
  const aspectRatio = normalizeAspectRatio(userAspect || '3:4')

  const cleanSubject = stripDataUrl(subjectImageBase64)
  const cleanGarment = stripDataUrl(garmentImageBase64)

  if (!cleanSubject || cleanSubject.length < 100) throw new Error('Invalid subject image')
  if (!cleanGarment || cleanGarment.length < 100) throw new Error('Invalid garment image')

  const preset = stylePresetId ? SCENE_PRESETS[stylePresetId] : null
  
  // Detect "keep background" modes: Clothing Only (no preset) or Keep Original preset
  const bgLower = backgroundInstruction.toLowerCase()
  const keepBg = !stylePresetId ||  // No preset = Clothing Only
                 stylePresetId === 'keep_original' ||
                 bgLower.includes('keep') || 
                 bgLower.includes('original') ||
                 bgLower.includes('same') ||
                 bgLower.includes('unchanged')

  // Build prompt based on model type
  const prompt = isPro 
    ? buildProPrompt(keepBg, preset, backgroundInstruction, lightingInstruction)
    : buildFlashPrompt(keepBg, preset, backgroundInstruction, lightingInstruction)

  // Very low temperature for consistency
  // Lower = more consistent face matching
  const temperature = isPro ? 0.02 : 0.05

  console.log(`🚀 Render: model=${model}, preset=${stylePresetId || 'custom'}, keepBg=${keepBg}, temp=${temperature}`)
  console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`)

  // Build content - SAME structure for both (Pro works, so use same for Flash)
  const contents: ContentListUnion = [
    { inlineData: { data: cleanSubject, mimeType: 'image/jpeg' } } as any,
    { inlineData: { data: cleanGarment, mimeType: 'image/jpeg' } } as any,
    prompt,
  ]

  const imageConfig: ImageConfig = { aspectRatio } as any
  if (isPro && resolution) {
    ;(imageConfig as any).imageSize = resolution
  }

  const config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
    imageConfig,
    temperature,
  }

  const startTime = Date.now()
  const resp = await client.models.generateContent({ model, contents, config })
  const elapsed = Date.now() - startTime
  console.log(`⏱️ Render completed in ${(elapsed / 1000).toFixed(1)}s`)

  if (resp.candidates?.length) {
    for (const part of resp.candidates[0]?.content?.parts || []) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
      }
    }
  }

  if ((resp as any).data) return `data:image/png;base64,${(resp as any).data}`

  throw new Error('No image generated')
}

// Compatibility wrapper
export async function renderTryOnV3(params: {
  subjectImageBase64: string
  garmentImageBase64: string
  garmentBackupImageBase64?: string
  identityImagesBase64?: string[]
  stylePack?: any
  backgroundFocus?: any
  shootPlan: { scene_text: string; prompt_text?: string }
  opts: { quality: 'fast' | 'high'; aspectRatio?: string; resolution?: string }
  extraStrict?: boolean
  garmentAnalysis?: any
  stylePresetId?: string
}): Promise<string> {
  return renderTryOnFast({
    subjectImageBase64: params.subjectImageBase64,
    garmentImageBase64: params.garmentImageBase64,
    backgroundInstruction: params.shootPlan.scene_text || 'keep original background',
    lightingInstruction: 'natural lighting',
    quality: params.opts.quality,
    aspectRatio: params.opts.aspectRatio,
    resolution: params.opts.resolution,
    stylePresetId: params.stylePresetId,
  })
}
