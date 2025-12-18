import { getOpenAI } from '@/lib/openai'

function formatImageUrl(base64: string) {
  if (base64.startsWith('data:image/')) return base64
  return `data:image/jpeg;base64,${base64}`
}

export type BodyPose = 'standing' | 'sitting' | 'leaning' | 'walking' | 'other'

export interface PhotoAnalysis {
  pose_summary: string
  /** Detected body pose for scene adaptation */
  body_pose: BodyPose
  camera_summary: string
  lighting_summary: string
  realism_constraints: string
  camera_manifest: {
    capture_type: 'iphone_candid' | 'dslr_mirrorless' | 'film_35mm' | 'flash_digicam' | 'unknown'
    focal_length_hint_mm: '24-28' | '28-35' | '35-50' | '50-85' | 'unknown'
    dof_hint: 'deep' | 'moderate' | 'shallow' | 'unknown'
    lighting_type:
      | 'diffused_daylight'
      | 'open_shade_daylight'
      | 'golden_hour'
      | 'foggy_morning'
      | 'on_camera_flash'
      | 'mixed_neon_night'
      | 'mixed'
      | 'unknown'
    wb_family: 'warm' | 'neutral' | 'cool' | 'mixed' | 'unknown'
    imperfections: {
      grain_level: 'none' | 'subtle' | 'medium' | 'strong' | 'unknown'
      compression_hint: 'none' | 'mild_jpeg' | 'heavy_compression' | 'unknown'
      vignette_hint: 'none' | 'subtle' | 'strong' | 'unknown'
      chromatic_aberration_hint: 'none' | 'mild' | 'strong' | 'unknown'
      handheld_tilt_ok: boolean
    }
  }
}

/**
 * Analyze the SUBJECT photo (image 1) for camera + lighting cues so our generated background
 * doesn't look "AI perfect" and stays consistent with the original capture.
 */
export async function analyzeSubjectPhoto(subjectImageBase64: string): Promise<PhotoAnalysis> {
  const openai = getOpenAI()

  const system = `You are a professional photographer analyzing a single portrait photo.
Return ONLY JSON with keys:
body_pose, pose_summary, camera_summary, lighting_summary, realism_constraints, camera_manifest.

Rules:
- body_pose MUST be one of: "standing", "sitting", "leaning", "walking", "other"
  * "standing" = person is upright on their feet, not supported
  * "sitting" = person is seated on chair, floor, steps, etc.
  * "leaning" = person is leaning against wall, railing, or object
  * "walking" = person appears to be in motion/walking
  * "other" = any other pose (lying down, crouching, etc.)
- Do NOT describe the person's identity traits (no face details, no ethnicity, no age guesses).
- Focus ONLY on photographic/cinematography cues and pose/body position (standing/seated, arm placement).
- realism_constraints should include: grain/noise level, lens/DOF cues, small imperfections to avoid CGI look,
  and how to keep lighting/shadows consistent with the original photo.
- camera_manifest must be a JSON object with keys:
  capture_type (iphone_candid|dslr_mirrorless|film_35mm|flash_digicam|unknown),
  focal_length_hint_mm (24-28|28-35|35-50|50-85|unknown),
  dof_hint (deep|moderate|shallow|unknown),
  lighting_type (diffused_daylight|open_shade_daylight|golden_hour|foggy_morning|on_camera_flash|mixed_neon_night|mixed|unknown),
  wb_family (warm|neutral|cool|mixed|unknown),
  imperfections: grain_level (none|subtle|medium|strong|unknown), compression_hint (none|mild_jpeg|heavy_compression|unknown),
  vignette_hint (none|subtle|strong|unknown), chromatic_aberration_hint (none|mild|strong|unknown), handheld_tilt_ok (boolean).
If unsure, use 'unknown' and set handheld_tilt_ok=false.`

  const user: any[] = [
    { type: 'text', text: 'Analyze this subject photo for camera, lighting, and realism constraints.' },
    { type: 'image_url', image_url: { url: formatImageUrl(subjectImageBase64), detail: 'high' } },
  ]

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user as any },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 500,
  })

  const content = resp.choices?.[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(content) as any

  // Normalize body_pose
  const rawPose = String(parsed.body_pose || '').toLowerCase().trim()
  let body_pose: BodyPose = 'other'
  if (rawPose === 'standing') body_pose = 'standing'
  else if (rawPose === 'sitting') body_pose = 'sitting'
  else if (rawPose === 'leaning') body_pose = 'leaning'
  else if (rawPose === 'walking') body_pose = 'walking'

  return {
    pose_summary: String(parsed.pose_summary || '').trim(),
    body_pose,
    camera_summary: String(parsed.camera_summary || '').trim(),
    lighting_summary: String(parsed.lighting_summary || '').trim(),
    realism_constraints: String(parsed.realism_constraints || '').trim(),
    camera_manifest: {
      capture_type:
        parsed?.camera_manifest?.capture_type === 'iphone_candid' ||
        parsed?.camera_manifest?.capture_type === 'dslr_mirrorless' ||
        parsed?.camera_manifest?.capture_type === 'film_35mm' ||
        parsed?.camera_manifest?.capture_type === 'flash_digicam'
          ? parsed.camera_manifest.capture_type
          : 'unknown',
      focal_length_hint_mm:
        parsed?.camera_manifest?.focal_length_hint_mm === '24-28' ||
        parsed?.camera_manifest?.focal_length_hint_mm === '28-35' ||
        parsed?.camera_manifest?.focal_length_hint_mm === '35-50' ||
        parsed?.camera_manifest?.focal_length_hint_mm === '50-85'
          ? parsed.camera_manifest.focal_length_hint_mm
          : 'unknown',
      dof_hint:
        parsed?.camera_manifest?.dof_hint === 'deep' ||
        parsed?.camera_manifest?.dof_hint === 'moderate' ||
        parsed?.camera_manifest?.dof_hint === 'shallow'
          ? parsed.camera_manifest.dof_hint
          : 'unknown',
      lighting_type:
        parsed?.camera_manifest?.lighting_type === 'diffused_daylight' ||
        parsed?.camera_manifest?.lighting_type === 'open_shade_daylight' ||
        parsed?.camera_manifest?.lighting_type === 'golden_hour' ||
        parsed?.camera_manifest?.lighting_type === 'foggy_morning' ||
        parsed?.camera_manifest?.lighting_type === 'on_camera_flash' ||
        parsed?.camera_manifest?.lighting_type === 'mixed_neon_night' ||
        parsed?.camera_manifest?.lighting_type === 'mixed'
          ? parsed.camera_manifest.lighting_type
          : 'unknown',
      wb_family:
        parsed?.camera_manifest?.wb_family === 'warm' ||
        parsed?.camera_manifest?.wb_family === 'neutral' ||
        parsed?.camera_manifest?.wb_family === 'cool' ||
        parsed?.camera_manifest?.wb_family === 'mixed'
          ? parsed.camera_manifest.wb_family
          : 'unknown',
      imperfections: {
        grain_level:
          parsed?.camera_manifest?.imperfections?.grain_level === 'none' ||
          parsed?.camera_manifest?.imperfections?.grain_level === 'subtle' ||
          parsed?.camera_manifest?.imperfections?.grain_level === 'medium' ||
          parsed?.camera_manifest?.imperfections?.grain_level === 'strong'
            ? parsed.camera_manifest.imperfections.grain_level
            : 'unknown',
        compression_hint:
          parsed?.camera_manifest?.imperfections?.compression_hint === 'none' ||
          parsed?.camera_manifest?.imperfections?.compression_hint === 'mild_jpeg' ||
          parsed?.camera_manifest?.imperfections?.compression_hint === 'heavy_compression'
            ? parsed.camera_manifest.imperfections.compression_hint
            : 'unknown',
        vignette_hint:
          parsed?.camera_manifest?.imperfections?.vignette_hint === 'none' ||
          parsed?.camera_manifest?.imperfections?.vignette_hint === 'subtle' ||
          parsed?.camera_manifest?.imperfections?.vignette_hint === 'strong'
            ? parsed.camera_manifest.imperfections.vignette_hint
            : 'unknown',
        chromatic_aberration_hint:
          parsed?.camera_manifest?.imperfections?.chromatic_aberration_hint === 'none' ||
          parsed?.camera_manifest?.imperfections?.chromatic_aberration_hint === 'mild' ||
          parsed?.camera_manifest?.imperfections?.chromatic_aberration_hint === 'strong'
            ? parsed.camera_manifest.imperfections.chromatic_aberration_hint
            : 'unknown',
        handheld_tilt_ok:
          typeof parsed?.camera_manifest?.imperfections?.handheld_tilt_ok === 'boolean'
            ? parsed.camera_manifest.imperfections.handheld_tilt_ok
            : false,
      },
    },
  }
}


