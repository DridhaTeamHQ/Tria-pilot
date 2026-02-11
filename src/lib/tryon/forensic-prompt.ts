/**
 * FORENSIC PROMPT BUILDER (Stage 2)
 *
 * Builds a strict control JSON prompt for Nano Banana Pro.
 * Goal: conservative compositor behavior (not creative reinterpretation).
 */

import 'server-only'

export interface ForensicPromptInput {
  garmentDescription?: string
  preset?: string
  lighting?: string
  realismGuidance?: string
  garmentOnPersonGuidance?: string
  faceForensicAnchor?: string
  characterSummary?: string
  poseSummary?: string
  appearanceSummary?: string
  aspectRatio?: '1:1' | '4:5' | '3:4' | '9:16'
  retryMode?: boolean
  sceneCorrectionGuidance?: string
  lightingBlueprint?: string
  presetAvoid?: string
  bodyAnchor?: string
  faceBox?: {
    ymin: number
    xmin: number
    ymax: number
    xmax: number
  }
}

export function buildForensicPrompt(input: ForensicPromptInput): string {
  const garment = input.garmentDescription?.trim() || 'garment from Image 2'
  const environment = input.preset?.trim() || 'keep background from Image 1'
  const realism = input.realismGuidance?.trim() || 'maintain physically plausible ambient lighting'
  const lighting = input.lighting?.trim() || 'ambient_only'
  const garmentFit =
    input.garmentOnPersonGuidance?.trim() ||
    'garment follows original shoulder slope and torso drape from Image 1'
  const faceAnchor =
    input.faceForensicAnchor?.trim() ||
    'preserve exact eye geometry, nose bridge and tip, lip contour, jawline, skin texture, facial hair pattern, and eyewear geometry'
  const characterSummary = input.characterSummary?.trim() || 'single subject from Image 1'
  const poseSummary = input.poseSummary?.trim() || 'inherit pose and head angle from Image 1'
  const appearanceSummary = input.appearanceSummary?.trim() || 'preserve stable hairstyle and accessories from Image 1'
  const aspectRatio = input.aspectRatio || '1:1'
  const retryMode = Boolean(input.retryMode)
  const sceneCorrectionGuidance = input.sceneCorrectionGuidance?.trim()
  const lightingBlueprint =
    input.lightingBlueprint?.trim() ||
    'Match scene lighting on subject with coherent key/fill behavior and consistent shadow direction and color temperature.'
  const presetAvoidTerms = (input.presetAvoid || '')
    .split(/[;,]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  const bodyAnchor =
    input.bodyAnchor?.trim() ||
    'preserve original body build, weight, shoulder width, torso mass, and limb proportions exactly as visible in Image 1'
  const faceBox = input.faceBox
  const faceSpatialLock = faceBox
    ? {
        source: 'Image_1_face_bbox_0_1000',
        bbox: {
          ymin: Math.max(0, Math.min(1000, Math.round(faceBox.ymin))),
          xmin: Math.max(0, Math.min(1000, Math.round(faceBox.xmin))),
          ymax: Math.max(0, Math.min(1000, Math.round(faceBox.ymax))),
          xmax: Math.max(0, Math.min(1000, Math.round(faceBox.xmax))),
        },
        tolerance: {
          center_shift_max: 45,
          scale_delta_max: 0.12,
        },
        instruction: 'keep_face_bbox_center_and_scale_locked',
      }
    : undefined

  const hardSafetySuffix = [
    'no surreal elements',
    'no fantasy effects',
    'no glitch art',
    'no collage artifacts',
    'no duplicated features',
    'no floating objects',
    'no exaggerated anatomy',
    'no body distortion',
    'no extra text',
    'no logos',
    'no watermarks',
    'no unrealistic lighting',
    'no painterly style',
    'no illustrated style',
  ]

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAN CONTROL JSON — identity + task only, NO integration rules here.
  // Integration rules go in plain text where the model weights them higher.
  // ═══════════════════════════════════════════════════════════════════════════
  const control = {
    mode: 'PIXEL_PRIORITY',
    identity_lock: 'ABSOLUTE',
    face: {
      source: 'Image_1',
      forensic_signature: faceAnchor,
      spatial_lock: faceSpatialLock,
      character: characterSummary,
      pose: poseSummary,
      appearance: appearanceSummary,
    },
    task: {
      action: 'dress_person_in_Image_1_with_garment_from_Image_2',
      garment: garment,
      fit: garmentFit,
      environment,
      lighting_blueprint: lightingBlueprint,
      scene_correction: sceneCorrectionGuidance || undefined,
    },
    face_rules: [
      'preserve_exact_face_geometry_and_pixels',
      'preserve_gaze_eye_alignment_nose_lips_jawline',
      'no_face_relight_reshape_beautify_smooth',
      'keep_face_position_and_scale_locked',
      'no_double_face_ghosting_extra_person',
    ],
    body_rules: [
      'keep_pose_body_hands_from_Image_1',
      'preserve_exact_body_proportions_weight_and_silhouette',
      'no_slimming_elongating_or_reshaping',
      'allow_body_and_clothing_relight_to_match_scene',
    ],
    body: {
      source: 'Image_1',
      silhouette: bodyAnchor,
      policy: 'preserve_exact_proportions',
    },
    render: {
      type: 'photorealistic',
      aspect_ratio: aspectRatio,
    },
    avoid: [
      'cinematic portrait', 'editorial', 'fashion model', 'dramatic relighting',
      'beautify face', 'changed identity', 'double face', 'ghost face',
      'pasted on background', 'cut-out look', 'floating subject',
      'mismatched lighting', 'sticker effect', 'flat subject on background',
      'slimmed body', 'thinned waist', 'elongated torso', 'narrowed shoulders',
      'idealized proportions', 'model body type', 'beauty-standard reshape',
      ...presetAvoidTerms,
    ],
    ...(retryMode
      ? {
          retry: {
            rule: 'identity_non_negotiable',
            enforce: ['exact_face_from_image_1', 'no_gaze_change', 'no_face_relight'],
          },
        }
      : {}),
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PROMPT STRUCTURE: plain-text integration > lean JSON > plain-text close
  // Integration in PLAIN TEXT so the model can't deprioritize it.
  // ═══════════════════════════════════════════════════════════════════════════
  const integrationBlock = [
    `SCENE INTEGRATION (CRITICAL — this is NOT a collage):`,
    `The person must look like they were PHOTOGRAPHED in this environment: "${environment}".`,
    `Relight the body, arms, and clothing to match the scene light direction and color temperature. ${lightingBlueprint}`,
    `Add ambient color spill from the environment onto the subject's skin and clothing edges.`,
    `Add subtle light wrap where the subject outline meets bright background areas.`,
    `Add realistic contact shadows and ambient occlusion where the body meets nearby surfaces.`,
    `Match the subject's sharpness, noise grain, and depth-of-field to the background.`,
    `The subject and background must share the same color temperature, dynamic range, and optical characteristics.`,
    `Do NOT produce a flat, pasted, or sticker look. The person must be IN the scene, not placed ON it.`,
    realism,
    sceneCorrectionGuidance ? `Scene fix: ${sceneCorrectionGuidance}` : '',
  ].filter(Boolean).join('\n')

  const faceBlock = [
    `FACE LOCK (non-negotiable):`,
    `The face from Image 1 is immutable. Do not relight, reshape, beautify, smooth, or reposition it.`,
    `Forensic anchor: ${faceAnchor}`,
  ].join('\n')

  const bodyBlock = [
    `BODY PRESERVATION (non-negotiable):`,
    `The person's body proportions from Image 1 are authoritative. Do NOT slim, elongate, narrow, or reshape any body part.`,
    `Body anchor: ${bodyAnchor}`,
    `Shoulder width, torso mass, waist, hip width, arm thickness, and overall weight must match Image 1 exactly.`,
    `The garment must conform to the body as-is — the body does NOT conform to the garment.`,
    `No idealization, no beauty-standard correction, no fitness-model adjustment.`,
  ].join('\n')

  return [
    integrationBlock,
    '',
    faceBlock,
    '',
    bodyBlock,
    '',
    `CONTROL=${JSON.stringify(control)}`,
    '',
    'Generate one photorealistic image. The person must appear naturally inside the scene — same light, same space, same camera. Body proportions must exactly match the source.',
  ].join('\n')
}
