import { getOpenAI } from '@/lib/openai'

function formatImageUrl(base64: string) {
  if (base64.startsWith('data:image/')) return base64
  return `data:image/jpeg;base64,${base64}`
}

export interface PhotoAnalysis {
  pose_summary: string
  camera_summary: string
  lighting_summary: string
  realism_constraints: string
}

/**
 * Analyze the SUBJECT photo (image 1) for camera + lighting cues so our generated background
 * doesn't look "AI perfect" and stays consistent with the original capture.
 */
export async function analyzeSubjectPhoto(subjectImageBase64: string): Promise<PhotoAnalysis> {
  const openai = getOpenAI()

  const system = `You are a professional photographer analyzing a single portrait photo.
Return ONLY JSON with keys:
pose_summary, camera_summary, lighting_summary, realism_constraints.

Rules:
- Do NOT describe the person's identity traits (no face details, no ethnicity, no age guesses).
- Focus ONLY on photographic/cinematography cues and pose/body position (standing/seated, arm placement).
- realism_constraints should include: grain/noise level, lens/DOF cues, small imperfections to avoid CGI look,
  and how to keep lighting/shadows consistent with the original photo.`

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

  return {
    pose_summary: String(parsed.pose_summary || '').trim(),
    camera_summary: String(parsed.camera_summary || '').trim(),
    lighting_summary: String(parsed.lighting_summary || '').trim(),
    realism_constraints: String(parsed.realism_constraints || '').trim(),
  }
}


