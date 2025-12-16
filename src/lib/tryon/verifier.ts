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
ok, reasons (array of strings), has_extra_people, appears_collage, garment_applied, garment_fidelity, identity_preserved, identity_fidelity, original_outfit_still_present, output_is_unedited_copy.

Rules:
- ok is true only if: exactly one subject AND no collage/cutout AND garment from reference is worn by subject AND garment closely matches reference (high fidelity) AND the subject's original outfit is NOT still present AND output is not an unedited copy of the subject image AND face/identity matches subject image.
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


