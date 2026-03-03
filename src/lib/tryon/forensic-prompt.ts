/**
 * FORENSIC PROMPT BUILDER (Stage 2)
 *
 * Builds a strict control JSON prompt for Nano Banana Pro.
 * Goal: conservative compositor behavior (not creative reinterpretation).
 */

import 'server-only'
import type { PresetStrengthProfile } from './preset-strength-profile'

export interface ForensicPromptInput {
  garmentDescription?: string
  preset?: string
  lighting?: string
  realismGuidance?: string
  garmentOnPersonGuidance?: string
  faceForensicAnchor?: string
  eyesAnchor?: string
  characterSummary?: string
  poseSummary?: string
  appearanceSummary?: string
  aspectRatio?: '1:1' | '4:5' | '3:4' | '9:16'
  retryMode?: boolean
  sceneCorrectionGuidance?: string
  lightingBlueprint?: string
  presetAvoid?: string
  bodyAnchor?: string
  identityCorrectionGuidance?: string
  styleGuidance?: string
  colorGradingGuidance?: string
  cameraGuidance?: string
  poseInferenceGuidance?: string
  researchContext?: string
  webResearchContext?: string
  additionalAvoidTerms?: string[]
  identityPriorityRules?: string[]
  strengthProfile?: PresetStrengthProfile
  hasFaceReference?: boolean
  faceSpatialLockQuality?: 'strict' | 'relaxed'
  faceBox?: {
    ymin: number
    xmin: number
    ymax: number
    xmax: number
  }
}

export function buildForensicPrompt(input: ForensicPromptInput): string {
  const clamp = (value: string, max: number) =>
    value.length > max ? `${value.slice(0, max)}...` : value

  const garment = input.garmentDescription?.trim() || 'garment from Image 2'
  const environment = clamp(input.preset?.trim() || 'keep background from Image 1', 420)
  const isSceneChange = environment !== 'keep background from Image 1'
  const realism = clamp(
    input.realismGuidance?.trim() || 'maintain physically plausible ambient lighting',
    520
  )
  const lighting = input.lighting?.trim() || 'ambient_only'
  const garmentFit =
    input.garmentOnPersonGuidance?.trim() ||
    'garment follows original shoulder slope and torso drape from Image 1'
  const faceAnchor =
    input.faceForensicAnchor?.trim() ||
    'preserve exact eye geometry, nose bridge and tip, lip contour, cheek fullness, midface contour, jawline, skin texture, facial hair pattern, and eyewear geometry'
  const eyesAnchor =
    input.eyesAnchor?.trim() ||
    'almond eye shape, medium inter-eye spacing, dark brown iris color, forward gaze direction, stable eyelid crease and brow geometry'
  const characterSummary = input.characterSummary?.trim() || 'single subject from Image 1'
  const poseSummary = input.poseSummary?.trim() || 'inherit pose and head angle from Image 1'
  const appearanceSummary =
    input.appearanceSummary?.trim() || 'preserve stable hairstyle and accessories from Image 1'
  const aspectRatio = input.aspectRatio || '1:1'
  const retryMode = Boolean(input.retryMode)
  const sceneCorrectionGuidance = input.sceneCorrectionGuidance?.trim()
  const lightingBlueprint = clamp(
    input.lightingBlueprint?.trim() ||
      'Match scene lighting on subject with coherent key/fill behavior and consistent shadow direction and color temperature.',
    620
  )
  const presetAvoidTerms = (input.presetAvoid || '')
    .split(/[;,]/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  const additionalAvoidTerms = (input.additionalAvoidTerms || [])
    .map(term => term.trim().toLowerCase())
    .filter(Boolean)
  const mergedAvoidTerms = Array.from(new Set([...presetAvoidTerms, ...additionalAvoidTerms]))
  const bodyAnchor =
    input.bodyAnchor?.trim() ||
    'preserve original body build, weight, shoulder width, torso mass, and limb proportions exactly as visible in Image 1'
  const identityCorrectionGuidance = input.identityCorrectionGuidance?.trim()
  const styleGuidance = input.styleGuidance?.trim()
    ? clamp(input.styleGuidance.trim(), 360)
    : undefined
  const colorGradingGuidance = input.colorGradingGuidance?.trim()
    ? clamp(input.colorGradingGuidance.trim(), 220)
    : undefined
  const cameraGuidance = input.cameraGuidance?.trim()
    ? clamp(input.cameraGuidance.trim(), 180)
    : undefined
  const poseInferenceGuidance = input.poseInferenceGuidance?.trim()
    ? clamp(input.poseInferenceGuidance.trim(), 260)
    : undefined
  const researchContext = input.researchContext?.trim()
    ? clamp(input.researchContext.trim(), 450)
    : undefined
  const webResearchContext = input.webResearchContext?.trim()
    ? clamp(input.webResearchContext.trim(), 220)
    : undefined
  const identityPriorityRules = (input.identityPriorityRules || [])
    .map(rule => rule.trim())
    .filter(Boolean)
  const strengthProfile = input.strengthProfile
  const hasFaceReference = Boolean(input.hasFaceReference)
  const faceSpatialLockQuality = input.faceSpatialLockQuality || 'strict'
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
          center_shift_max: faceSpatialLockQuality === 'strict' ? 24 : 32,
          scale_delta_max: faceSpatialLockQuality === 'strict' ? 0.07 : 0.1,
        },
        instruction:
          faceSpatialLockQuality === 'strict'
            ? 'keep_face_bbox_center_and_scale_locked'
            : 'keep_face_bbox_center_and_scale_stable',
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

  const control = {
    mode: 'PIXEL_PRIORITY',
    identity_lock: 'ABSOLUTE',
    face: {
      source: 'Image_1',
      forensic_signature: faceAnchor,
      eyes_signature: eyesAnchor,
      spatial_lock: faceSpatialLock,
      character: characterSummary,
      pose: poseSummary,
      appearance: appearanceSummary,
    },
    task: {
      action: isSceneChange
        ? 'place_person_from_Image_1_into_new_scene_wearing_garment_from_Image_2'
        : 'dress_person_in_Image_1_with_garment_from_Image_2',
      edit_scope: isSceneChange
        ? 'change_garment_AND_background_preserve_face_and_body_geometry'
        : 'replace_garment_only_preserve_head_face_body_geometry',
      garment,
      fit: garmentFit,
      environment,
      lighting_blueprint: lightingBlueprint,
      scene_correction: sceneCorrectionGuidance || undefined,
    },
    face_rules: [
      'preserve_exact_face_geometry_and_pixels',
      'preserve_gaze_eye_alignment_nose_lips_jawline',
      'preserve_exact_eye_shape_spacing_iris_and_gaze_from_Image_1',
      'preserve_exact_eye_aperture_and_brow_eye_distance_from_Image_1',
      'preserve_exact_cheek_volume_midface_width_and_facial_fullness_from_Image_1',
      'no_eye_resize_recolor_reposition_or_expression_change',
      'allow_face_relight_to_match_scene_while_preserving_identity',
      'no_bone_structure_change_or_facial_proportion_reinterpretation',
      'no_face_beautify_airbrush_or_smoothing_filter',
      'keep_face_position_and_scale_locked',
      'no_double_face_ghosting_extra_person',
    ],
    body_rules: [
      'keep_pose_behavior_compatible_with_Image_1_and_preset',
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
      'beautify face', 'changed identity', 'double face', 'ghost face',
      'changed eyes', 'different gaze direction', 'eye shape change', 'iris color change',
      'smooth skin', 'bone structure change', 'facial proportion change', 'beard change',
      'face retouch', 'skin airbrushing', 'face contouring effect', 'face reshaping',
      'eye enlargement', 'jawline slimming', 'cheekbone enhancement', 'digital makeup look',
      'de-aged face', 'younger-looking face', 'wrinkle removal', 'skin whitening',
      'skin brightening on face', 'fairness filter look', 'complexion shift',
      'puffier cheeks', 'fuller face', 'wider midface', 'inflated face volume',
      'changed eye aperture', 'rounder eyes', 'larger eye opening', 'altered brow-eye spacing',
      'pasted on background', 'cut-out look', 'floating subject',
      'mismatched lighting', 'sticker effect', 'flat subject on background',
      'blurred background haze', 'mushy background', 'smudged background textures',
      'portrait mode cutout blur', 'gaussian background blur', 'fake bokeh circles',
      'halo around subject edges', 'edge matte halo', 'subject cutout outline',
      'mismatched perspective', 'disconnected foreground', 'weak depth layering',
      'slimmed body', 'thinned waist', 'elongated torso', 'narrowed shoulders',
      'idealized proportions', 'model body type', 'beauty-standard reshape',
      ...mergedAvoidTerms,
      ...hardSafetySuffix,
    ],
    ...(retryMode
      ? {
          retry: {
            rule: 'identity_non_negotiable',
            enforce: [
              'exact_face_from_image_1',
              'exact_eyes_from_image_1',
              'no_eye_change',
              'no_gaze_change',
              'no_face_reshape',
              'no_face_beautify',
            ],
          },
        }
      : {}),
  }

  const integrationBlock = [
    `EDIT SCOPE:`,
    isSceneChange
      ? `Place the person from Image 1 into a NEW environment (described below) wearing the garment from Image 2. The background MUST change — do NOT keep the original background from Image 1.`
      : `Change the garment on the person in Image 1 to the garment from Image 2. Keep the original background.`,
    `Preserve the person's identity from Image 1: head, face, neck, hair, ears, glasses, shoulders, arms, hands, torso silhouette, waist, and body proportions.`,
    `Do NOT slim, reshape, stylize, or beautify the person. Keep face shape and body geometry unchanged.`,
    '',
    isSceneChange ? `SCENE (CRITICAL — generate a new background, this is NOT a clothing-only swap):` : `SCENE:`,
    isSceneChange
      ? `Generate a completely new scene: "${environment}". The person must look like they were PHOTOGRAPHED in this environment — not pasted onto it.`
      : `Keep the original background from Image 1. Only change the garment.`,
    `Allow the face and body to naturally inherit the scene's lighting, shadows, and color temperature. ${lightingBlueprint}`,
    `Relight the face, skin, body, arms, and clothing so the subject feels photographed inside the environment, while preserving exact facial proportions and geometry.`,
    `Add ambient color spill from the environment onto the subject's skin and clothing edges.`,
    `Add subtle light wrap where the subject outline meets bright background areas.`,
    `Add realistic contact shadows and ambient occlusion where the body meets nearby surfaces.`,
    `Match the subject's sharpness, noise grain, and depth-of-field to the background.`,
    `Build the image as a coherent depth stack with believable foreground cues, the subject grounded in the true midground focus plane, and background elements receding naturally.`,
    `Keep foreground, subject, and background composition physically connected with consistent scale, perspective, and optical depth.`,
    `Avoid the typical AI blurred-background look: no smeared walls, no mushy textures, no fake portrait-mode masking, and no generic haze behind the subject.`,
    `If shallow depth of field is used, it must look optically plausible with gradual falloff and readable material detail, not a cut-out blur halo around the subject.`,
    `Keep background materials naturally textured and non-plastic (real micro-contrast, no CGI-like smoothing).`,
    `The subject and background must share the same color temperature, dynamic range, and optical characteristics.`,
    `Do NOT produce a flat, pasted, or sticker look. The person must be IN the scene, not placed ON it.`,
    hasFaceReference
      ? `Reminder: Image 3 (face crop) is your ground truth for the face. Match every facial proportion and texture detail to Image 3.`
      : '',
    strengthProfile
      ? `PRESET STRENGTH WEIGHTS (0-1): framing=${strengthProfile.framingDiscipline.toFixed(2)}, color=${strengthProfile.colorCleanliness.toFixed(2)}, mood=${strengthProfile.moodIntensity.toFixed(2)}, grain=${strengthProfile.grainTexture.toFixed(2)}, iphone_realism=${strengthProfile.iphoneRealism.toFixed(2)}, pose_freedom=${strengthProfile.poseFreedom.toFixed(2)}, identity_rigidity=${strengthProfile.identityRigidity.toFixed(2)}, stylization=${strengthProfile.stylizationAllowance.toFixed(2)}.`
      : '',
    strengthProfile
      ? `Apply these weights as behavior controls on environment, garment, and non-face skin only: higher framing/color weights enforce cleaner composition and color discipline; higher mood/grain/stylization weights allow stronger scene aesthetic cues; higher iphone_realism favors candid smartphone rendering; higher pose_freedom allows natural non-rigid posture while preserving anatomy; identity_rigidity is always dominant.`
      : '',
    styleGuidance
      ? `STYLE TARGET (from high-performing references): ${styleGuidance}. Keep this mood while preserving exact identity and body geometry. Apply style cues to scene/background/garment only; never to facial geometry or face skin texture.`
      : '',
    colorGradingGuidance
      ? `Color treatment target: ${colorGradingGuidance}. Keep skin tones natural and identity-faithful. Let the face share the scene grade, color temperature, and shadow falloff, but avoid beautification, airbrushing, or geometry changes.`
      : '',
    cameraGuidance
      ? `Camera treatment target: ${cameraGuidance}. Camera look adjustments apply to scene integration and garment rendering only, never to face structure or face texture. Preserve believable foreground, subject, and background separation without synthetic blur or masking artifacts.`
      : '',
    poseInferenceGuidance
      ? `Pose intelligence: infer a natural scene-appropriate pose and posture from styling cues (${poseInferenceGuidance}) while avoiding mannequin stiffness and preserving anatomy.`
      : '',
    researchContext
      ? `RESEARCH MEMORY (high-priority lessons from prior successful/failed generations): ${researchContext}`
      : '',
    webResearchContext
      ? `LIVE WEB RESEARCH (preset-tuned realism hints): ${webResearchContext}`
      : '',
    `Pose realism rule: preserve the source person's recognizable body language and anatomy while allowing safe preset-compatible posture variation. Small changes in body angle, seated/standing adaptation, hand placement, or weight shift are allowed only if required by the preset and must never change body proportions, limb length, or facial identity.`,
    realism,
    sceneCorrectionGuidance ? `Scene fix: ${sceneCorrectionGuidance}` : '',
  ].filter(Boolean).join('\n')

  const faceBlock = [
    `FACE LOCK (non-negotiable):`,
    `The face from Image 1 is immutable. Do not reshape, slim, narrow, beautify, smooth, or reposition it.`,
    `FACE GEOMETRY ANCHOR: this person has ${faceAnchor}. The generated face MUST match these exact proportions — do not slim the face, do not narrow the jaw, do not widen the midface, do not make the face fuller or puffier, do not alter cheek volume, and do not thin the beard.`,
    `Allow the face to inherit scene lighting, shadow direction, white balance, and color temperature so it integrates naturally with the environment.`,
    `Ensure the lighting on the face fully integrates with the background while preserving bone structure, facial geometry, and recognizable identity.`,
    `Face texture lock: preserve pore detail, beard strands, and natural micro-contrast from Image 1. Do not denoise, airbrush, or smooth facial skin.`,
    `Avoid beauty-filter behavior or complexion cleanup on the face. Preserve natural skin texture and undertone while allowing realistic scene-driven relighting and exposure adaptation.`,
    identityCorrectionGuidance ? `Identity correction priority: ${identityCorrectionGuidance}` : '',
  ].filter(Boolean).join('\n')

  const primaryAuthorityBlock = [
    `PRIMARY AUTHORITY — IDENTITY PRESERVATION (non-negotiable):`,
    `The person in Image 1 is the sole identity reference. You must produce a face that is recognizably the SAME individual — if shown side by side, a viewer must immediately confirm it is the same person.`,
    hasFaceReference
      ? `Image 3 is a close-up crop of the person's face from Image 1. Use Image 3 as your pixel-level authority for every facial feature: the exact shape and spacing of the eyes, the nose bridge width and tip shape, the lip contour and mouth width, the jawline angle, the beard density and edge pattern, the skin texture including pores and blemishes, and any eyewear. Copy these features from Image 3, do not reinterpret them.`
      : '',
    `Facial structure must remain genetically identical: eye spacing/eyelid shape, nose bridge contour, lip shape/mouth curvature, cheek volume, midface width, jawline/chin, beard density and edge pattern, and skin tone with natural unretouched texture.`,
    `Preserve perceived age exactly as in Image 1. No de-aging, no youthification, no wrinkle removal, and no age reinterpretation.`,
    `Preserve original skin luminance and undertone from Image 1. No skin whitening/brightening, no fairness shift, and no beauty skin cleanup.`,
    `Do NOT beautify, enhance, smooth skin, alter bone structure, or reinterpret facial proportions.`,
    `Facial identity and overall recognizability must stay inherited from Image 1. Pose may adapt naturally to the preset as long as face geometry, body proportions, and identity remain unchanged.`,
    ...identityPriorityRules.map(rule => `Identity priority: ${rule}`),
  ].filter(Boolean).join('\n')

  const garmentBlock = [
    `GARMENT APPLICATION (non-negotiable):`,
    `Apply the garment from Image 2 accurately and preserve fabric texture, collar structure, sleeve length, and color integrity.`,
    `GARMENT COLOR LOCK: keep hue, saturation, brightness, undertone, and local contrast of the garment consistent with Image 2. Do not recolor garment to match scene grade.`,
    `If color grading is applied, grade the scene while preserving original garment color identity from Image 2.`,
    `Do NOT restyle the garment.`,
    `Garment fit guidance: ${garmentFit}.`,
  ].join('\n')

  const eyesBlock = [
    `EYES LOCK (non-negotiable):`,
    `Preserve EXACT eye shape, inter-eye spacing, iris color, gaze direction, eyelid crease, and brow-eye geometry from Image 1.`,
    `Do NOT change eye size, spacing, iris color, gaze, eyelid fold, brow-eye relation, or eye aperture/opening.`,
    `Preserve natural sclera tone, pupil size ratio, eyelid thickness, and catchlight direction from Image 1.`,
    `Avoid lazy eye drift, mismatched pupils, or asymmetric eyelid deformation.`,
    `Eyes anchor: ${eyesAnchor}`,
    retryMode ? `RETRY ENFORCEMENT: absolute no_eye_change; copy eye identity from Image 1 exactly.` : '',
  ].filter(Boolean).join('\n')

  const bodyBlock = [
    `BODY PRESERVATION (non-negotiable):`,
    `The person's body proportions from Image 1 are authoritative. Do NOT slim, elongate, narrow, or reshape any body part.`,
    `Body anchor: ${bodyAnchor}`,
    `Shoulder width, torso mass, waist, hip width, arm thickness, and overall weight must match Image 1 exactly.`,
    `The garment must conform to the body as-is — the body does NOT conform to the garment.`,
    `No idealization, no beauty-standard correction, no fitness-model adjustment.`,
  ].join('\n')

  return [
    primaryAuthorityBlock,
    '',
    integrationBlock,
    '',
    garmentBlock,
    '',
    faceBlock,
    '',
    eyesBlock,
    '',
    bodyBlock,
    '',
    `CONTROL=${JSON.stringify(control)}`,
    '',
    'OUTPUT: single photorealistic composite with natural skin detail, coherent scene integration, realistic foreground-midground-background composition, and face lighting that fully matches the environment. Keep identity exact; allow preset-guided style without altering facial structure or body proportions.',
    hasFaceReference
      ? 'VERIFICATION: Before finalizing, compare the face you generated against Image 3 (face crop). The eye spacing, nose shape, jawline, beard pattern, and skin texture must match Image 3 exactly. If they do not match, regenerate the face region to match Image 3.'
      : '',
    'Generate one photorealistic image. The person must appear naturally inside the scene — same light, same space, same camera. Body proportions must exactly match the source.',
  ].join('\n')
}
