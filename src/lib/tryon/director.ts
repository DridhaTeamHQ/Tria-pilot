import { getOpenAI } from '@/lib/openai'
import type { BackgroundFocusMode, InstagramStylePack, ShootPlanV3 } from './types'

const SYSTEM_PROMPT = `You are an expert Photography Director for a virtual try-on system.
Your job: convert preset names into detailed PHOTOGRAPHY instructions that make AI output look like REAL PHOTOS.

═══════════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════════

1) SUBJECT LOCK: Never describe the person. Always say "The subject" or "they".
   - NO face/hair/skin/body descriptions
   - NO ethnicity, age, gender descriptions
   - NO clothing descriptions (garment is provided separately)

2) POSE PRESERVATION: The subject's pose comes from their original photo.
   - Do NOT invent new poses
   - Do NOT suggest pose changes unless the preset explicitly requires it
   - If pose_name is "keep unchanged" → describe the pose as "maintaining their natural pose from the original capture"

3) PHOTOGRAPHY FOCUS: You are describing HOW to photograph, not WHAT to photograph.
   - Lens choice, focal length, aperture
   - Camera position, angle, framing
   - Lighting direction, quality, color temperature
   - Film/sensor characteristics
   - Imperfections that make it look real

4) REALISM OVER STYLE:
   - Default to natural, everyday realism
   - NO neon/cyberpunk unless explicitly requested
   - NO wet reflective streets unless it's actually raining
   - NO heavy color gels unless it's a party/club scene
   - NO studio-perfect lighting for outdoor/casual scenes

5) PHYSICAL PLAUSIBILITY:
   - Scene must make sense for the pose
   - Sitting pose → needs something to sit on (bench, chair, steps)
   - Standing in street → sidewalk, not middle of road
   - NO floating furniture, impossible placements

6) LIGHTING CONSISTENCY:
   - Match the photo constraints from the original capture
   - If original is daylight → scene should be daylight
   - Shadow direction must be consistent
   - Color temperature must match between subject and background

═══════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON only)
═══════════════════════════════════════════════════════════════════
{
  "scene_text": "Scene/location/time/weather description. Subject pose context.",
  "camera_text": "Lens, focal length, aperture, camera position, framing, DOF description.",
  "imperfection_text": "REQUIRED imperfections: grain type, noise level, vignette, CA, lens softness, compression artifacts.",
  "negative_text": "NEGATIVE: list of things to avoid"
}

Return ONLY valid JSON. No markdown, no extra text.`

// Photography imperfection presets based on research
const IMPERFECTION_PRESETS = {
  iphone: {
    grain: 'subtle digital noise (ISO 200-400 equivalent), more visible in shadows',
    vignette: 'minimal (SmartHDR compensates)',
    ca: 'slight purple fringing on high-contrast edges',
    compression: 'mild JPEG artifacts visible at 100% zoom',
    lens: 'slight softness at corners, computational sharpening in center',
  },
  dslr_natural: {
    grain: 'fine film-like grain (ISO 400-800), organic texture',
    vignette: 'subtle natural falloff at corners (1-2 stops)',
    ca: 'minimal, corrected in-camera',
    compression: 'minimal (high quality)',
    lens: 'sharp center, gradual softness toward edges',
  },
  flash_harsh: {
    grain: 'heavy noise in shadow areas (pushed film look)',
    vignette: 'strong falloff from flash coverage',
    ca: 'visible on flash reflections',
    compression: 'moderate (party photo aesthetic)',
    lens: 'sharp in flash-lit areas, soft in shadows',
  },
  film_35mm: {
    grain: 'visible organic grain (Kodak Portra 400 or Tri-X 400), consistent across frame',
    vignette: 'moderate natural lens vignette',
    ca: 'subtle color fringing typical of film lenses',
    compression: 'none (film scan)',
    lens: 'characteristic lens rendering, swirly bokeh possible',
  },
  documentary: {
    grain: 'heavy grain (pushed ISO 1600-3200), gritty texture',
    vignette: 'strong from wide-angle lens',
    ca: 'noticeable on edges',
    compression: 'moderate',
    lens: 'wide-angle distortion, deep DOF',
  },
}

function getImperfectionPreset(stylePack?: InstagramStylePack): typeof IMPERFECTION_PRESETS.iphone {
  switch (stylePack) {
    case 'candid_iphone':
      return IMPERFECTION_PRESETS.iphone
    case 'editorial_ig':
      return IMPERFECTION_PRESETS.dslr_natural
    case 'flash_party':
      return IMPERFECTION_PRESETS.flash_harsh
    case 'travel_journal':
      return IMPERFECTION_PRESETS.film_35mm
    case 'surveillance_doc':
      return IMPERFECTION_PRESETS.documentary
    default:
      return IMPERFECTION_PRESETS.dslr_natural
  }
}

function stylePackDescription(stylePack?: InstagramStylePack): string {
  switch (stylePack) {
    case 'candid_iphone':
      return 'Candid iPhone snapshot: handheld feel, SmartHDR processing, slightly warm, JPEG compression visible, natural imperfect bokeh from small sensor.'
    case 'editorial_ig':
      return 'Editorial Instagram: 50-85mm lens, controlled bokeh, clean grade, skin texture visible, professional but not sterile.'
    case 'flash_party':
      return 'Flash party/digicam: harsh on-camera flash, deep shadows, high contrast, noise in dark areas, crooked framing OK, no retouching.'
    case 'travel_journal':
      return 'Travel journal: warm golden light, light haze, subtle flare, handheld framing, vacation snap aesthetic, rich colors.'
    case 'surveillance_doc':
      return 'Documentary/surveillance: high angle, wide lens, flat contrast, muted colors, motion blur OK, gritty and unpolished.'
    default:
      return 'Natural photography: real camera imperfections, visible grain, natural bokeh, slight vignette, no CGI look.'
  }
}

function focusDescription(backgroundFocus?: BackgroundFocusMode): string {
  return backgroundFocus === 'sharper_bg'
    ? 'Background focus: Keep environment sharp (f/5.6-f/8), full context visible, texture preserved, minimal bokeh.'
    : 'Background focus: Moderate DOF (f/2.8-f/4), natural bokeh with micro-texture preserved, NOT Gaussian blur.'
}

function extractJsonObject(raw: string): string {
  const trimmed = (raw || '').trim()
  if (!trimmed) throw new Error('Empty response')
  try {
    JSON.parse(trimmed)
    return trimmed
  } catch {
    // continue
  }
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first === -1 || last === -1 || last <= first) {
    throw new Error('No JSON object found in response')
  }
  return trimmed.slice(first, last + 1)
}

export async function generateShootPlanV3(params: {
  pose_name: string
  lighting_name: string
  background_name: string
  userRequest?: string
  photoConstraints?: string
  photoManifest?: Record<string, unknown>
  stylePack?: InstagramStylePack
  backgroundFocus?: BackgroundFocusMode
  realismRecipe?: {
    id: string
    scene_template: string
    negative_template: string
    camera: { lens_hint: string; pov_hint: string; framing_hint: string; dof_hint: string }
    imperfections: {
      grain: string
      compression: string
      vignette: string
      chromatic_aberration: string
      handheld_tilt_ok: boolean
      motion_blur_hint: string
    }
  }
  selectedRecipeWhy?: string
}): Promise<ShootPlanV3> {
  const {
    pose_name,
    lighting_name,
    background_name,
    userRequest,
    photoConstraints,
    photoManifest,
    stylePack,
    backgroundFocus,
    realismRecipe,
    selectedRecipeWhy,
  } = params
  const openai = getOpenAI()

  const imperfections = getImperfectionPreset(stylePack)
  
  const recipeBlock = realismRecipe
    ? `
SELECTED REALISM RECIPE: ${realismRecipe.id}
Reason: ${selectedRecipeWhy || 'best match'}
Scene template: ${realismRecipe.scene_template}
Camera: ${realismRecipe.camera.lens_hint}, ${realismRecipe.camera.pov_hint}, ${realismRecipe.camera.framing_hint}, ${realismRecipe.camera.dof_hint}
Recipe imperfections: grain=${realismRecipe.imperfections.grain}, compression=${realismRecipe.imperfections.compression}, vignette=${realismRecipe.imperfections.vignette}, CA=${realismRecipe.imperfections.chromatic_aberration}
Recipe negatives: ${realismRecipe.negative_template}`
    : ''

  const userPrompt = `
═══════════════════════════════════════════════════════════════════
INPUT PARAMETERS
═══════════════════════════════════════════════════════════════════
Pose: ${pose_name}
Lighting: ${lighting_name}  
Background: ${background_name}
Style: ${stylePackDescription(stylePack)}
${focusDescription(backgroundFocus)}
${userRequest ? `User request: ${userRequest}` : ''}

═══════════════════════════════════════════════════════════════════
PHOTO CONSTRAINTS (from original capture - MUST FOLLOW)
═══════════════════════════════════════════════════════════════════
${photoConstraints || 'Match the original photo lighting and camera perspective.'}
${photoManifest ? `Structured data: ${JSON.stringify(photoManifest)}` : ''}

═══════════════════════════════════════════════════════════════════
IMPERFECTION REQUIREMENTS (style-specific)
═══════════════════════════════════════════════════════════════════
Grain: ${imperfections.grain}
Vignette: ${imperfections.vignette}
Chromatic aberration: ${imperfections.ca}
Compression: ${imperfections.compression}
Lens character: ${imperfections.lens}
${recipeBlock}

═══════════════════════════════════════════════════════════════════
YOUR TASK
═══════════════════════════════════════════════════════════════════
Generate a photography direction that:
1. Describes the SCENE (location, time, weather, atmosphere) that fits the pose
2. Specifies CAMERA settings (lens, position, framing, DOF) 
3. Lists REQUIRED IMPERFECTIONS to make it look like a real photo
4. Lists what to AVOID (AI artifacts, CGI look, etc.)

CRITICAL:
- Scene must be physically plausible for the pose
- If sitting → there must be something to sit on
- If street → subject on sidewalk, not in traffic
- Lighting must match the photo constraints
- Include ALL imperfections - this is what makes it look real

Return ONLY JSON with keys: scene_text, camera_text, imperfection_text, negative_text
`

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.15, // Lower for more consistent output
    max_tokens: 700,
  })

  const content = resp.choices?.[0]?.message?.content ?? ''
  const jsonText = extractJsonObject(content)
  const parsed = JSON.parse(jsonText) as any

  const scene_text = String(parsed?.scene_text ?? '').trim()
  const camera_text = String(parsed?.camera_text ?? '').trim()
  const imperfection_text = String(parsed?.imperfection_text ?? '').trim()
  let negative_text = String(parsed?.negative_text ?? '').trim()

  // Ensure imperfection_text includes our requirements if model skipped them
  const enhancedImperfections = imperfection_text || `
REQUIRED IMPERFECTIONS:
- Grain: ${imperfections.grain}
- Vignette: ${imperfections.vignette}
- Chromatic aberration: ${imperfections.ca}
- Compression: ${imperfections.compression}
- Lens: ${imperfections.lens}
- Background: preserve micro-texture even in bokeh areas, NO smeary/painterly blur`

  const promptFromParts = [scene_text, camera_text, enhancedImperfections, negative_text].filter(Boolean).join('\n\n')
  const prompt_text = promptFromParts || String(parsed?.prompt_text ?? '').trim()
  if (!prompt_text) throw new Error('Director output missing prompt content')

  // Ensure negative text is comprehensive
  if (!negative_text || !/^NEGATIVE:/i.test(negative_text)) {
    negative_text = `NEGATIVE: extra people, duplicate subject, collage, overlay, pasted reference image, cutout, mannequin, text, logo, watermark, 
- CGI/3D render look, overly perfect surfaces, plastic skin, waxy texture
- Perfect bokeh circles, Gaussian blur backgrounds, smeary/painterly blur
- HDR glow, bloom, haloing around subject
- Neon/cyberpunk grading (unless explicitly requested)
- Wet reflective streets without rain
- Studio-perfect lighting for outdoor scenes
- AI artifacts, unnatural symmetry, impossible anatomy`
  }

  // Combine into final prompt
  const finalPrompt = `${scene_text}

${camera_text}

${enhancedImperfections}

${negative_text}`

  return {
    prompt_text: finalPrompt,
    scene_text: scene_text || undefined,
    camera_text: camera_text || undefined,
    imperfection_text: enhancedImperfections || undefined,
    negative_text,
    selected_recipe_id: realismRecipe?.id,
    selected_recipe_why: selectedRecipeWhy,
  }
}
