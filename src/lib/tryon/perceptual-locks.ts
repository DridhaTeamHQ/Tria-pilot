/**
 * PERCEPTUAL LOCKS - Phase 3A
 *
 * Reduces uncanny perception by limiting avoidable variability.
 * These constraints are hard locks and are not user-configurable.
 */

import 'server-only'

export const FACE_LIGHTING_LOCK = {
  type: 'soft_frontal' as const,
  direction: 'front',
  intensity: 'even',
  contrast: 'low',
  shadows: 'minimal',
  forbidden: [
    'dramatic',
    'harsh',
    'side_lit',
    'rim_light',
    'high_contrast',
    'moody',
    'chiaroscuro',
    'silhouette',
    'backlighting_on_face',
  ],
} as const

export const ENVIRONMENT_LIGHTING_OPTIONS = {
  natural_daylight: 'Soft natural daylight with even distribution.',
  golden_hour: 'Warm golden-hour light on the environment and body.',
  overcast: 'Diffused overcast light with soft shadows.',
  indoor_ambient: 'Natural indoor ambient light.',
  street_lighting: 'Natural urban street lighting.',
} as const

export type EnvironmentLightingType = keyof typeof ENVIRONMENT_LIGHTING_OPTIONS

export function buildLightingConstraint(
  environmentType: EnvironmentLightingType = 'natural_daylight'
): string {
  return [
    'Lighting lock: non-negotiable.',
    '',
    'Face lighting is locked:',
    '- soft, frontal, and even',
    '- minimal face shadows',
    '- low contrast on the face',
    '- no dramatic, side, or high-contrast face lighting',
    '',
    'Environment and body lighting may vary:',
    `- ${ENVIRONMENT_LIGHTING_OPTIONS[environmentType]}`,
    '- Background may carry natural mood and depth.',
    '- Body may carry natural shadows.',
    '',
    'Reason: stable face lighting reduces uncanny edges and compositing artifacts.',
  ].join('\n')
}

export const CANONICAL_CAMERA = {
  focalLength: '28mm',
  height: 'eye_level',
  distanceOptions: {
    selfie: 'arm_length',
    portrait: 'conversational',
    full_body: 'full_frame',
  },
  angle: 'straight_on',
  forbidden: [
    'DSLR',
    'professional camera',
    'studio camera',
    'cinematic',
    'wide angle distortion',
    'fish eye',
    'telephoto compression',
    'drone shot',
    'low angle hero shot',
    'Dutch angle',
  ],
} as const

export type CameraDistance = keyof typeof CANONICAL_CAMERA.distanceOptions

export function buildCameraConstraint(distance: CameraDistance = 'portrait'): string {
  return [
    'Camera lock: non-negotiable.',
    '',
    'Camera type:',
    '- phone camera perspective',
    `- ${CANONICAL_CAMERA.focalLength} equivalent focal length`,
    '- natural perspective',
    '',
    'Camera position:',
    '- eye level',
    '- straight-on angle',
    `- distance: ${CANONICAL_CAMERA.distanceOptions[distance]}`,
    '',
    'Forbidden camera language:',
    '- DSLR or studio camera',
    '- cinematic camera work',
    '- extreme or stylized perspectives',
    '',
    'Reason: phone-camera perspective is more stable and less uncanny.',
  ].join('\n')
}

export const EXPRESSION_GAZE_LOCK = {
  expression: {
    primary: 'neutral',
    secondary: 'relaxed',
    forbidden: [
      'smiling',
      'happy',
      'pleasant',
      'confident',
      'model-like',
      'professional',
      'attractive',
      'engaging',
      'warm',
      'inviting',
      'sultry',
      'serious',
      'intense',
    ],
  },
  gaze: {
    direction: 'forward',
    target: 'camera',
    forbidden: [
      'looking away',
      'candid glance',
      'looking off camera',
      'dreamy gaze',
      'introspective',
    ],
  },
} as const

export function buildExpressionConstraint(): string {
  return [
    'Expression and gaze lock: non-negotiable.',
    '',
    'Expression:',
    '- neutral primary expression',
    '- relaxed only if a slight expression is needed',
    '- no smiling, happy, confident, model-like, or stylized expressions',
    '',
    'Gaze:',
    '- forward toward camera',
    '- no looking away or off-camera glance',
    '',
    'Reason: expression drift is a major source of perceived identity drift.',
  ].join('\n')
}

export interface PerceptualLockConfig {
  environmentLighting?: EnvironmentLightingType
  cameraDistance?: CameraDistance
}

export function buildPerceptualLockPrompt(config: PerceptualLockConfig = {}): string {
  const {
    environmentLighting = 'natural_daylight',
    cameraDistance = 'portrait',
  } = config

  return [
    'Perceptual locks: Phase 3A entropy reduction.',
    'These constraints cannot be overridden by presets or user input.',
    '',
    buildExpressionConstraint(),
    '',
    buildLightingConstraint(environmentLighting),
    '',
    buildCameraConstraint(cameraDistance),
  ].join('\n')
}

export function validatePresetAgainstLocks(preset: {
  lighting_name?: string
  pose_name?: string
  camera_spec?: string
}): { valid: boolean; warnings: string[] } {
  const warnings: string[] = []

  if (preset.lighting_name) {
    const lower = preset.lighting_name.toLowerCase()
    for (const forbidden of FACE_LIGHTING_LOCK.forbidden) {
      if (lower.includes(forbidden.toLowerCase())) {
        warnings.push(`Preset lighting "${preset.lighting_name}" contains forbidden term "${forbidden}"`)
      }
    }
  }

  if (preset.camera_spec) {
    const lower = preset.camera_spec.toLowerCase()
    for (const forbidden of CANONICAL_CAMERA.forbidden) {
      if (lower.includes(forbidden.toLowerCase())) {
        warnings.push(`Preset camera "${preset.camera_spec}" contains forbidden term "${forbidden}"`)
      }
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  }
}

export function logPerceptualLockStatus(): void {
  console.log('\nPERCEPTUAL LOCKS ACTIVE')
  console.log('   Face lighting: soft, frontal, even')
  console.log('   Camera: 28mm phone camera, eye-level')
  console.log('   Expression: neutral')
  console.log('   Gaze: forward')
  console.log('   Purpose: reduce uncanny perception, not correctness')
}
