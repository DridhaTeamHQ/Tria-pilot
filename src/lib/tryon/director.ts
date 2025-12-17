import { getOpenAI } from '@/lib/openai'
import type { BackgroundFocusMode, InstagramStylePack, ShootPlanV3 } from './types'

const SYSTEM_PROMPT = `You are a photography director. Convert preset names into simple, natural scene descriptions.

RULES:
1. Write like you're describing a real photo, not giving complex instructions
2. Keep it SHORT - one paragraph maximum
3. Never describe the person's face, body, ethnicity, or clothing
4. Focus on: location, lighting, time of day, atmosphere
5. Use natural language, not technical jargon

OUTPUT: Return JSON with these keys:
- scene_text: One paragraph describing the scene/setting (no person details)
- imperfection_text: Brief note on photo realism (grain, lighting quality)

Keep it simple and natural.`

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
    stylePack,
    realismRecipe,
    selectedRecipeWhy,
  } = params
  const openai = getOpenAI()

  // Get style description
  const styleDesc = (() => {
    switch (stylePack) {
      case 'candid_iphone': return 'candid iPhone photo'
      case 'editorial_ig': return 'editorial Instagram photo'
      case 'flash_party': return 'flash party photo'
      case 'travel_journal': return 'travel journal snapshot'
      case 'surveillance_doc': return 'documentary style'
      default: return 'natural photo'
    }
  })()

  const userPrompt = `Create a simple scene description for a ${styleDesc}.

Setting: ${background_name}
Lighting: ${lighting_name}
Pose context: ${pose_name}
${userRequest ? `User note: ${userRequest}` : ''}
${photoConstraints ? `Match this lighting/time: ${photoConstraints}` : ''}
${realismRecipe ? `Use this recipe for inspiration: ${realismRecipe.scene_template}` : ''}

Return JSON with:
- scene_text: Simple description of the setting (1-2 sentences, no person details)
- imperfection_text: Brief realism note (grain type, lighting quality)

Keep it natural and simple. No technical jargon.`

  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 300,
    })

    const content = resp.choices?.[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(content) as any

    const scene_text = String(parsed?.scene_text ?? '').trim() || 
      `A natural ${background_name} setting with ${lighting_name} lighting.`
    
    const imperfection_text = String(parsed?.imperfection_text ?? '').trim() ||
      'Natural photo with subtle grain and real skin texture.'

    return {
      prompt_text: scene_text,
      scene_text,
      imperfection_text,
      selected_recipe_id: realismRecipe?.id,
      selected_recipe_why: selectedRecipeWhy,
    }
  } catch {
    // Fallback to simple description
    return {
      prompt_text: `A natural ${background_name} setting with ${lighting_name} lighting.`,
      scene_text: `A natural ${background_name} setting with ${lighting_name} lighting.`,
      imperfection_text: 'Natural photo with subtle grain and real skin texture.',
      selected_recipe_id: realismRecipe?.id,
      selected_recipe_why: selectedRecipeWhy,
    }
  }
}
