import { getOpenAI } from '@/lib/openai'
import type { VerifyResult } from './types'

function formatImageUrl(base64: string) {
  if (base64.startsWith('data:image/')) return base64
  return `data:image/jpeg;base64,${base64}`
}

export async function verifyTryOnImage(params: {
  outputImageBase64: string
  subjectImageBase64: string
  garmentRefBase64: string
}): Promise<VerifyResult> {
  const openai = getOpenAI()

  const system = `You are a strict QA checker for a virtual try-on system.
Return ONLY JSON with keys:
ok, reasons (array of strings), has_extra_people, appears_collage, scene_plausible, lighting_realism, lighting_consistent, subject_color_preserved, looks_ai_generated, garment_applied, garment_fidelity, identity_preserved, identity_fidelity, original_outfit_still_present, output_is_unedited_copy.

Rules:
- ok is true only if: exactly one subject AND no collage/cutout AND garment from reference is worn by subject AND garment closely matches reference (high fidelity) AND the subject's original outfit is NOT still present AND output is not an unedited copy of the subject image AND face/identity matches subject image.
- scene_plausible is false if the setting is physically impossible or incoherent for the pose (e.g., sitting at a table in the middle of a road, floating furniture, indoor furniture randomly outdoors without context).
- lighting_realism is high/medium/low based on whether lighting and shadows look like a real photo (avoid studio-perfect, CGI glow, inconsistent shadow directions).
- lighting_consistent is false if the subject looks like it was shot in a different time-of-day than the background (e.g., daylight subject with night background), or if color temperature/shadow direction clearly mismatch between subject and background.
- subject_color_preserved is false if the subject's FACE/SKIN color/exposure/white-balance noticeably changed compared to IMAGE B (e.g., skin/face looks washed out, overly brightened, desaturated, or "whitened"). IGNORE clothing color changes (clothing is expected to change).
- looks_ai_generated is true if the output has a strong "AI look": overly perfect/clean surfaces, plastic skin, heavy glow/bloom, neon cyberpunk color grading without justification, wet reflective streets without rain context, unreal bokeh, unreal lighting, or obvious synthetic rendering artifacts.
- If a small pasted person/cutout appears, set appears_collage=true and ok=false.`

  const user = [
    { type: 'text', text: 'IMAGE A: Output image to verify.' },
    { type: 'image_url', image_url: { url: formatImageUrl(params.outputImageBase64), detail: 'high' } },
    { type: 'text', text: 'IMAGE B: Subject reference (identity + pose source).' },
    { type: 'image_url', image_url: { url: formatImageUrl(params.subjectImageBase64), detail: 'high' } },
    { type: 'text', text: 'IMAGE C: Garment reference (the garment to be worn by the subject).' },
    { type: 'image_url', image_url: { url: formatImageUrl(params.garmentRefBase64), detail: 'high' } },
    {
      type: 'text',
      text: `Check:
1) Does output contain exactly one subject (no extra people)?
2) Does it look like a collage/pasted cutout?
3) SCENE PLAUSIBILITY (true/false): is the background/context physically plausible for the pose? Flag tables/chairs in the middle of roads, floating props, impossible placements.
4) LIGHTING REALISM (high/medium/low): does the lighting/shadows look like a real photo? Penalize CGI-perfect lighting, mismatched shadow direction, or overly artificial glow.
5) LIGHTING CONSISTENT (true/false): does the subject lighting/time-of-day match the background? Flag daylight subject with night background or obvious color-temp mismatch.
6) SUBJECT COLOR PRESERVED (true/false): compared to IMAGE B, did the FACE/SKIN exposure/white balance/skin tone shift noticeably? If the face looks washed out/over-brightened/desaturated, set false. Ignore clothing color changes.
7) LOOKS AI GENERATED (true/false): does IMAGE A look like an AI render (neon/cyberpunk grade, heavy glow, plastic skin, unreal bokeh, wet street reflections without context)? If yes, set true.
3) Is the garment from reference worn by the subject?
4) GARMENT FIDELITY (high/medium/low): does the garment match the reference in color, pattern/embroidery/prints, neckline, buttons/placket, sleeve/armholes, overall shape?
5) Is the subject identity preserved (same person) compared to subject reference?
6) IDENTITY FIDELITY (high/medium/low): how close is the face to the subject reference? Count subtle drift (eye shape, lip shape, nose bridge, jawline, skin texture) as medium/low even if it "looks similar".
7) ORIGINAL OUTFIT STILL PRESENT (true/false): is the subject still wearing the same original outfit from IMAGE B instead of the garment from IMAGE C?
8) OUTPUT IS UNEDITED COPY (true/false): does IMAGE A look identical to IMAGE B (no meaningful edits), or only tiny changes without clothing replacement?`,
    },
  ] as any

  const resp = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 400,
  })

  const content = resp.choices?.[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(content) as any

  return {
    ok: !!parsed.ok,
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : [],
    has_extra_people: !!parsed.has_extra_people,
    appears_collage: !!parsed.appears_collage,
    // Conservative defaults: if verifier response is missing/invalid, assume it's NOT ok to force retry once.
    scene_plausible: typeof parsed.scene_plausible === 'boolean' ? parsed.scene_plausible : false,
    lighting_realism:
      parsed.lighting_realism === 'high' || parsed.lighting_realism === 'medium' || parsed.lighting_realism === 'low'
        ? parsed.lighting_realism
        : 'low',
    lighting_consistent: typeof parsed.lighting_consistent === 'boolean' ? parsed.lighting_consistent : false,
    subject_color_preserved: typeof parsed.subject_color_preserved === 'boolean' ? parsed.subject_color_preserved : false,
    // Conservative: if missing, assume it DOES look AI-generated so we retry once.
    looks_ai_generated: typeof parsed.looks_ai_generated === 'boolean' ? parsed.looks_ai_generated : true,
    garment_applied: !!parsed.garment_applied,
    garment_fidelity:
      parsed.garment_fidelity === 'high' || parsed.garment_fidelity === 'medium' || parsed.garment_fidelity === 'low'
        ? parsed.garment_fidelity
        : 'low',
    identity_preserved: !!parsed.identity_preserved,
    identity_fidelity:
      parsed.identity_fidelity === 'high' || parsed.identity_fidelity === 'medium' || parsed.identity_fidelity === 'low'
        ? parsed.identity_fidelity
        : 'low',
    original_outfit_still_present: !!parsed.original_outfit_still_present,
    output_is_unedited_copy: !!parsed.output_is_unedited_copy,
  }
}
