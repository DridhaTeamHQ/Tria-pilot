/**
 * INPUT COVERAGE PROMPT INJECTION
 *
 * Injects coverage-aware constraints into Nano Banana prompts.
 * If the camera did not capture it, the model must not invent it.
 */

import 'server-only'
import type { InputCoverage, InputCoverageResult, GenerationMode } from './input-coverage-detector'
import type { GarmentTopology } from './garment-topology-classifier'

export class GenerationConstraintError extends Error {
  constructor(
    message: string,
    public readonly inputCoverage: InputCoverage,
    public readonly requiredCoverage: InputCoverage,
    public readonly garmentTopology?: GarmentTopology
  ) {
    super(message)
    this.name = 'GenerationConstraintError'
  }
}

export const FACE_ONLY_CONSTRAINT = [
  'Input coverage constraint: FACE_ONLY.',
  'The input image shows only the face. Body coverage is not available.',
  '',
  'Rules:',
  '- Do not hallucinate body parts that are not visible in the input.',
  '- Do not generate legs, hips, or full silhouettes.',
  '- Do not generate dresses, skirts, or pants.',
  '- Render only an upper-body garment preview.',
  '- Crop or softly fade the output below chest level.',
  '- Prioritize realism over completeness.',
  '',
  'Allowed:',
  '- Face preserved exactly.',
  '- Shoulders inferred naturally.',
  '- Upper chest area.',
  '- Garment neckline and collar.',
  '',
  'Forbidden:',
  '- No mannequin bodies.',
  '- No floating face on generated body.',
  '- No full-length silhouette.',
  '- No dress generation.',
  '- No pant generation.',
].join('\n')

export const UPPER_BODY_CONSTRAINT = [
  'Input coverage constraint: UPPER_BODY.',
  'The input image shows the face and upper body. Hips and legs are not visible.',
  '',
  'Rules:',
  '- Do not hallucinate lower body parts.',
  '- Do not generate full-length silhouettes.',
  '- Render the upper garment clearly.',
  '- Lower body may be softly faded or cropped.',
  '- Do not generate a full-length outfit.',
  '',
  'Allowed:',
  '- Face preserved exactly.',
  '- Shoulders and arms.',
  '- Torso down to waist or hip level.',
  '- Upper garment in full detail.',
  '',
  'Forbidden:',
  '- No generated legs or knees.',
  '- No full dress or gown rendering.',
  '- No full-length pants or skirts.',
  '- No mannequin lower body.',
  '',
  'Output should fade or crop below the visible body boundary.',
].join('\n')

export const FULL_BODY_CONSTRAINT = ''

export function validateCoverageCompatibility(
  inputCoverage: InputCoverageResult,
  garmentTopology: GarmentTopology
): void {
  if (garmentTopology === 'DRESS' && inputCoverage.coverage !== 'FULL_BODY') {
    throw new GenerationConstraintError(
      `Dress requires full-body input. Current input: ${inputCoverage.coverage}`,
      inputCoverage.coverage,
      'FULL_BODY',
      garmentTopology
    )
  }

  if (garmentTopology === 'TWO_PIECE' && inputCoverage.coverage === 'FACE_ONLY') {
    throw new GenerationConstraintError(
      `Two-piece outfit requires at least upper-body input. Current input: ${inputCoverage.coverage}`,
      inputCoverage.coverage,
      'UPPER_BODY',
      garmentTopology
    )
  }
}

export function getDowngradedMode(
  inputCoverage: InputCoverage,
  garmentTopology: GarmentTopology
): { mode: GenerationMode; message: string } {
  if (garmentTopology === 'DRESS' && inputCoverage !== 'FULL_BODY') {
    return {
      mode: inputCoverage === 'FACE_ONLY' ? 'UPPER_BODY_PREVIEW_ONLY' : 'UPPER_BODY_WITH_FADE',
      message: 'Dress preview only - full-body image required for complete try-on',
    }
  }

  if (inputCoverage === 'FACE_ONLY') {
    return {
      mode: 'UPPER_BODY_PREVIEW_ONLY',
      message: 'Upper-body preview only - submit full-body image for complete try-on',
    }
  }

  if (inputCoverage === 'UPPER_BODY') {
    return {
      mode: 'UPPER_BODY_WITH_FADE',
      message: 'Upper-body try-on with fade - lower body not visible in input',
    }
  }

  return {
    mode: 'FULL_TRY_ON',
    message: 'Full try-on enabled',
  }
}

export function buildCoveragePromptInjection(coverageResult: InputCoverageResult): string {
  switch (coverageResult.coverage) {
    case 'FACE_ONLY':
      return FACE_ONLY_CONSTRAINT
    case 'UPPER_BODY':
      return UPPER_BODY_CONSTRAINT
    case 'FULL_BODY':
      return FULL_BODY_CONSTRAINT
    default:
      return FACE_ONLY_CONSTRAINT
  }
}

export function getCoverageReminder(coverage: InputCoverage): string {
  switch (coverage) {
    case 'FACE_ONLY':
      return [
        'COVERAGE: FACE_ONLY',
        '- Upper-body preview only.',
        '- No legs, hips, or full silhouettes.',
        '- Fade or crop below chest.',
      ].join('\n')
    case 'UPPER_BODY':
      return [
        'COVERAGE: UPPER_BODY',
        '- Upper garment in full detail.',
        '- Fade or crop below waist.',
        '- No full-length outfits.',
      ].join('\n')
    case 'FULL_BODY':
      return ''
    default:
      return ''
  }
}

export function logCoverageInjection(coverageResult: InputCoverageResult): void {
  if (coverageResult.coverage === 'FULL_BODY') {
    console.log('\nCOVERAGE CONSTRAINT: none (full body detected)')
    return
  }

  console.log('\nCOVERAGE CONSTRAINT INJECTED')
  console.log(`   Coverage: ${coverageResult.coverage}`)
  console.log(`   Mode: ${coverageResult.allowedMode}`)
  console.log('   Limited generation because the body is not fully visible.')
}
