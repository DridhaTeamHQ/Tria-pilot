/**
 * SIMPLIFIED PROMPT MODE
 *
 * For complex images, use a short, focused prompt instead of
 * massive detailed constraints that may dilute model attention.
 */

import 'server-only'

export const SIMPLIFIED_CORE_PROMPT = [
  'Task: virtual try-on.',
  'Put the garment from Image 2 onto the person in Image 1.',
  '',
  'Rules:',
  '- Keep the exact face from Image 1.',
  '- Keep the same background and location from Image 1.',
  '- Keep the same body proportions and pose from Image 1.',
  '- Use only the garment from Image 2 for clothing, color, pattern, and style.',
  '- Output must look like a real photo.',
  '',
  'Output: the person from Image 1 wearing the garment from Image 2 in the same location as Image 1.',
].join('\n')

export const BALANCED_PROMPT = [
  'Task: virtual try-on.',
  'Create an image where the person is from Image 1, the garment is from Image 2, and the scene remains from Image 1.',
  '',
  'Face rules:',
  '- Keep the exact same person from Image 1.',
  '- Preserve eyes, nose, mouth, jawline, and expression.',
  '- Do not beautify, replace, or reinterpret the face.',
  '',
  'Background rules:',
  '- Keep the same location type and atmosphere from Image 1.',
  '- Do not switch to a different environment.',
  '- Match the original scene lighting.',
  '',
  'Garment rules:',
  '- Use only the garment from Image 2.',
  '- Match its color, pattern, and style exactly.',
  '- Ignore any person or model shown in Image 2.',
  '- Drape the garment naturally on the body from Image 1.',
  '',
  'Output: a realistic photo of the person from Image 1 wearing the garment from Image 2.',
].join('\n')

export type PromptMode = 'simplified' | 'balanced' | 'full'

export function getPromptForComplexity(
  complexityScore: number,
  useSimplified: boolean = false
): { mode: PromptMode; prompt: string } {
  if (useSimplified) {
    return { mode: 'simplified', prompt: SIMPLIFIED_CORE_PROMPT }
  }

  if (complexityScore >= 70) {
    console.log(`Using SIMPLIFIED prompt for high-complexity image (score: ${complexityScore})`)
    return { mode: 'simplified', prompt: SIMPLIFIED_CORE_PROMPT }
  }

  if (complexityScore >= 40) {
    console.log(`Using BALANCED prompt for medium-complexity image (score: ${complexityScore})`)
    return { mode: 'balanced', prompt: BALANCED_PROMPT }
  }

  console.log(`Using FULL prompt for low-complexity image (score: ${complexityScore})`)
  return { mode: 'full', prompt: '' }
}

export function logPromptMode(mode: PromptMode, sessionId: string): void {
  const modeDescriptions = {
    simplified: 'short and focused',
    balanced: 'balanced detail',
    full: 'full detail',
  }

  console.log(`\nPROMPT MODE [${sessionId}]`)
  console.log(`   Mode: ${modeDescriptions[mode]}`)
}
