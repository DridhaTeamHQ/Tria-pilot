import type { BackgroundFocusMode, InstagramStylePack, ShootPlanV3 } from './types'

/**
 * Simple scene description generator.
 * No AI calls - just direct mapping for reliability.
 */
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
    lighting_name,
    background_name,
    userRequest,
    realismRecipe,
    selectedRecipeWhy,
  } = params

  // Simple, direct scene text - no complex AI generation
  let scene_text = background_name

  // Add lighting info
  if (lighting_name && !lighting_name.includes('keep')) {
    scene_text = `${scene_text} with ${lighting_name}`
  }

  // Add user request if provided
  if (userRequest) {
    scene_text = `${scene_text}. ${userRequest}`
  }

  // Use recipe template if available
  if (realismRecipe?.scene_template) {
    scene_text = realismRecipe.scene_template
  }

  return {
    prompt_text: scene_text,
    scene_text,
    selected_recipe_id: realismRecipe?.id,
    selected_recipe_why: selectedRecipeWhy,
  }
}
