/**
 * GARMENT EXTRACTOR
 * 
 * Production-grade garment extraction system that removes human bodies
 * from clothing reference images while preserving garment fidelity.
 * 
 * CRITICAL REQUIREMENTS:
 * - Remove ALL human anatomy (head, neck, arms, legs, torso)
 * - Preserve EXACT color (no recoloring)
 * - Preserve EXACT fabric texture
 * - Preserve EXACT patterns & prints
 * - Preserve EXACT stitching & details
 * - Preserve EXACT sleeve length, neckline, hem shape
 * 
 * Output: Clean garment-only image on neutral background
 */

import 'server-only'
import type { ContentListUnion, GenerateContentConfig } from '@google/genai'
import { geminiGenerateContent } from '@/lib/gemini/executor'
import type { GarmentAnalysis } from './face-analyzer'

function stripDataUrl(base64: string): string {
  return (base64 || '').replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACTION RESULT TYPE
// ═══════════════════════════════════════════════════════════════════════════════

export interface GarmentExtractionResult {
  /** Base64 garment-only image */
  image: string
  /** Whether extraction was successful */
  success: boolean
  /** Model used for extraction */
  model: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'
  /** Processing time in ms */
  processingTimeMs: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION-GRADE EXTRACTION PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

function buildExtractionPrompt(garmentAnalysis?: GarmentAnalysis): string {
  const garmentTypeHint = garmentAnalysis
    ? `The garment is: ${garmentAnalysis.summary}`
    : 'Analyze the garment type from the image.'

  return [
    'Create a garment-only technical asset from this clothing image.',
    garmentTypeHint,
    '',
    'Task:',
    '- Remove all human anatomy, mannequin parts, skin, and body pose cues.',
    '- Keep only the garment.',
    '',
    'Preserve garment fidelity:',
    '- Keep exact hue, saturation, brightness, and any color gradients.',
    '- Keep exact fabric texture, weave, weight, and reflectance.',
    '- Keep exact prints, embroidery, embellishments, and pattern placement.',
    '- Keep exact sleeve length, neckline, hem shape, seams, closures, and design details.',
    '',
    'Output requirements:',
    '- Front-facing floating garment on a clean white or light gray background.',
    '- Slight natural drape only.',
    '- All garment edges and details fully visible.',
    '- No harsh shadows and no stylized lighting.',
    '',
    'Forbidden:',
    '- Do not recolor, smooth, simplify, beautify, crop, or hallucinate new folds or details.',
    '- Do not add artistic effects.',
    '',
    'Return a technical garment asset, not a fashion photo.',
  ].join('\n')
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN EXTRACTION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract a garment-only image from a clothing reference that may include a person.
 * This is the LEGACY function - use extractGarmentWithFidelity for production.
 */
export async function extractGarmentOnlyImage(params: {
  clothingImageBase64: string
  model?: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'
}): Promise<string> {
  const result = await extractGarmentWithFidelity(params)
  return result.image
}

/**
 * PRODUCTION-GRADE garment extraction with fidelity preservation.
 * 
 * Removes all human anatomy while preserving exact garment characteristics:
 * - Color (no recoloring)
 * - Texture (no smoothing)
 * - Pattern (no simplification)
 * - Construction (all details preserved)
 * 
 * @param params.clothingImageBase64 - The clothing image (may contain person)
 * @param params.garmentAnalysis - Optional pre-analyzed garment info for better extraction
 * @param params.model - Gemini model to use (flash is faster, pro is higher quality)
 */
export async function extractGarmentWithFidelity(params: {
  clothingImageBase64: string
  garmentAnalysis?: GarmentAnalysis
  model?: 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'
}): Promise<GarmentExtractionResult> {
  const {
    clothingImageBase64,
    garmentAnalysis,
    model = 'gemini-2.5-flash-image'
  } = params

  const startTime = Date.now()

  const clean = stripDataUrl(clothingImageBase64)
  if (!clean || clean.length < 100) {
    throw new Error('Invalid clothing image for extraction')
  }

  console.log(`👔 GARMENT EXTRACTION: Starting with model ${model}...`)

  const extractionPrompt = buildExtractionPrompt(garmentAnalysis)

  const contents: ContentListUnion = [
    extractionPrompt,
    {
      inlineData: {
        data: clean,
        mimeType: 'image/jpeg',
      },
    } as any,
  ]

  const config: GenerateContentConfig = {
    responseModalities: ['IMAGE'],
  }

  try {
    const resp = await geminiGenerateContent({ model, contents, config })
    const processingTimeMs = Date.now() - startTime

    // Check for direct data response
    if (resp.data) {
      console.log(`✅ GARMENT EXTRACTION: Complete in ${processingTimeMs}ms`)
      return {
        image: `data:image/png;base64,${resp.data}`,
        success: true,
        model,
        processingTimeMs
      }
    }

    // Check candidates for image data
    if (resp.candidates?.length) {
      for (const part of resp.candidates[0]?.content?.parts || []) {
        if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData?.data) {
          console.log(`✅ GARMENT EXTRACTION: Complete in ${processingTimeMs}ms`)
          return {
            image: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
            success: true,
            model,
            processingTimeMs
          }
        }
      }
    }

    throw new Error('Garment extraction returned no image data')
  } catch (error) {
    const processingTimeMs = Date.now() - startTime
    console.error(`❌ GARMENT EXTRACTION: Failed after ${processingTimeMs}ms`, error)
    throw error
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGING
// ═══════════════════════════════════════════════════════════════════════════════

export function logGarmentExtractionStatus(sessionId: string, result: GarmentExtractionResult): void {
  console.log(`\n👔 GARMENT EXTRACTION [${sessionId}]`)
  console.log(`   ═══════════════════════════════════════════════`)
  console.log(`   ✓ Success: ${result.success ? 'YES' : 'NO'}`)
  console.log(`   ✓ Model: ${result.model}`)
  console.log(`   ✓ Time: ${result.processingTimeMs}ms`)
  console.log(`   ═══════════════════════════════════════════════`)
}

