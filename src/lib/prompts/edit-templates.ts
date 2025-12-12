export type EditType =
  | 'clothing_change'
  | 'background_change'
  | 'lighting_change'
  | 'pose_change'
  | 'camera_change'

export type ModelVariant = 'flash' | 'pro'

export interface EditPromptInput {
  editType: EditType

  /**
   * Optional user free-text request. Keep it short; templates will enforce strict rules.
   */
  userRequest?: string

  /**
   * Optional guidance. These are interpreted as *edit* requests, not identity changes.
   */
  background?: string
  pose?: string
  expression?: string
  camera?: string
  lighting?: string

  /**
   * Used to slightly tighten prompt adherence. (Not a hard guarantee.)
   */
  model?: ModelVariant
}

/**
 * Build a strict "image edit" instruction string.
 *
 * Based on Nano Banana Pro prompting guidance: keep structure clear and direct,
 * emphasize editing instructions and reference roles.
 *
 * Reference: `https://www.imagine.art/blogs/nano-banana-pro-prompt-guide`
 */
export function buildEditPrompt(input: EditPromptInput): string {
  const {
    editType,
    userRequest,
    background,
    pose,
    expression,
    camera,
    lighting,
    model = 'flash',
  } = input

  const userLine = userRequest?.trim() ? `User request: ${userRequest.trim()}` : ''

  // The "6 factors" guideline distilled into a strict edit context:
  // subject = the person image, composition = camera/framing, action = pose, setting = background, style = photoreal edit, editing instructions = editType rules.
  const compositionLines: string[] = []
  if (camera?.trim()) compositionLines.push(`Camera/Framing: ${camera.trim()}`)
  if (pose?.trim()) compositionLines.push(`Pose: ${pose.trim()} (slight change only; keep body shape)`)
  if (expression?.trim()) compositionLines.push(`Expression: ${expression.trim()} (subtle change only; keep identity)`)

  const settingLines: string[] = []
  if (background?.trim()) settingLines.push(`Background/Location: ${background.trim()}`)

  const lightingLines: string[] = []
  if (lighting?.trim()) lightingLines.push(`Lighting: ${lighting.trim()} (match shadows on subject)`)

  const perEditRules = getEditRules(editType)

  // Model-specific strictness (Pro can handle slightly longer prompts)
  const strictnessNote =
    model === 'pro'
      ? 'Follow instructions with maximum fidelity. This is a precise PHOTO EDIT, not a new generation.'
      : 'Follow instructions. This is a PHOTO EDIT, not a new generation.'

  return [
    'MODE: IMAGE EDIT / PHOTO REMIX',
    strictnessNote,
    '',
    'SUBJECT:',
    '- Use the PERSON IMAGE as the only source of identity/face/body.',
    '',
    'IDENTITY RULES (NON-NEGOTIABLE):',
    '- Face must remain 100% identical to the PERSON IMAGE.',
    '- No beautification: do not slim face, do not change eyes/nose/lips, do not smooth skin.',
    '- Preserve age signs, skin texture, moles, scars, pores. No de-aging.',
    '- Preserve gender expression and body proportions exactly.',
    '- Output must contain exactly ONE person (the person from the PERSON IMAGE).',
    '',
    'REALISM RULES:',
    '- Real-to-life photo edit. No CGI/plastic skin. No overly perfect studio look unless requested.',
    '- Keep realistic lighting interaction, shadows, and occlusion.',
    '',
    'EDIT INSTRUCTIONS:',
    ...perEditRules,
    '',
    compositionLines.length ? ['COMPOSITION:', ...compositionLines, ''].join('\n') : '',
    settingLines.length ? ['SETTING:', ...settingLines, ''].join('\n') : '',
    lightingLines.length ? ['LIGHTING:', ...lightingLines, ''].join('\n') : '',
    userLine,
    '',
    'FINAL CHECK:',
    '- Identity (face) must match PERSON IMAGE exactly.',
    '- If any instruction conflicts with identity, IGNORE the instruction and keep identity.',
  ]
    .filter(Boolean)
    .join('\n')
}

function getEditRules(editType: EditType): string[] {
  switch (editType) {
    case 'clothing_change':
      return [
        '- Replace the subject clothing to match the GARMENT REFERENCE image.',
        '- GARMENT REFERENCE is for CLOTHING ONLY: extract only garment color/pattern/texture/shape.',
        '- Ignore any face/person/body in the GARMENT REFERENCE completely.',
        '- Do a complete garment replacement (not a pasted overlay). Match neckline/sleeves accurately.',
      ]
    case 'background_change':
      return [
        '- Replace the background to match the BACKGROUND REFERENCE image.',
        '- BACKGROUND REFERENCE is for environment only (do not change the subject identity).',
        '- Match perspective, depth, and lighting so the subject looks truly in the scene.',
      ]
    case 'lighting_change':
      return [
        '- Adjust lighting on the subject and scene as requested (keep identity unchanged).',
        '- Preserve skin texture; do not retouch or beautify.',
        '- Lighting must be physically plausible: coherent shadows and highlights.',
      ]
    case 'pose_change':
      return [
        '- Make a slight pose change as requested while keeping body type and proportions.',
        '- Keep face identity unchanged and recognizable.',
        '- Keep the edit subtle: do not alter the person into a different model.',
      ]
    case 'camera_change':
      return [
        '- Adjust camera angle/framing slightly as requested (keep identity unchanged).',
        '- Maintain photorealistic optics and perspective.',
        '- Do not change the person into a different face/body.',
      ]
    default:
      return ['- Perform the requested edit while preserving identity exactly.']
  }
}


