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
  model: 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview'
  /** Processing time in ms */
  processingTimeMs: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTION-GRADE EXTRACTION PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

function buildExtractionPrompt(garmentAnalysis?: GarmentAnalysis): string {
  // Base garment info if analysis was provided
  const garmentTypeHint = garmentAnalysis
    ? `The garment is: ${garmentAnalysis.summary}`
    : 'Analyze the garment type from the image.'

  return `GARMENT EXTRACTION — TECHNICAL ASSET GENERATION

${garmentTypeHint}

══════════════════════════════════════════════════════════════════════════════
TASK: Create a GARMENT-ONLY flat-lay image from this clothing photo.
══════════════════════════════════════════════════════════════════════════════

1️⃣ REMOVE ALL HUMAN ANATOMY (MANDATORY):
   ✗ NO head
   ✗ NO neck
   ✗ NO face
   ✗ NO arms
   ✗ NO hands
   ✗ NO legs
   ✗ NO feet
   ✗ NO torso silhouette
   ✗ NO body pose cues
   ✗ NO skin visible
   ✗ NO mannequin parts

   The output must contain ONLY THE GARMENT.

2️⃣ PRESERVE GARMENT FIDELITY (CRITICAL — DO NOT ALTER):
   
   COLOR PRESERVATION:
   ✓ EXACT hue — no shifting towards warmer/cooler
   ✓ EXACT saturation — no boosting or muting
   ✓ EXACT brightness — no lightening or darkening
   ✓ EXACT color gradients if present
   
   FABRIC PRESERVATION:
   ✓ EXACT texture (silk sheen, cotton matte, velvet pile, etc.)
   ✓ EXACT weave pattern (visible threads, knit patterns)
   ✓ EXACT fabric weight appearance (floaty, structured, heavy)
   ✓ EXACT light reflection properties
   
   PATTERN PRESERVATION:
   ✓ EXACT print patterns (florals, geometrics, stripes)
   ✓ EXACT embroidery details
   ✓ EXACT embellishments (sequins, beads, mirrors)
   ✓ EXACT print scale and placement
   
   CONSTRUCTION PRESERVATION:
   ✓ EXACT sleeve length and style
   ✓ EXACT neckline shape
   ✓ EXACT hem shape and length
   ✓ EXACT buttons, zippers, closures
   ✓ EXACT seams and stitching
   ✓ EXACT design details (pleats, ruffles, pockets)

3️⃣ OUTPUT FORMAT REQUIREMENTS:
   • Floating garment (as if on invisible form)
   • Clean white or light grey background (no gradients)
   • Front-facing presentation
   • Slight natural drape (gravity effect only)
   • All design details clearly visible
   • No harsh shadows
   • No artificial lighting effects added

❌ ABSOLUTELY FORBIDDEN:
   • Simplifying fabric texture
   • Smoothing or blurring patterns
   • Hallucinating new folds or drape
   • Changing any colors
   • Adding or removing details
   • Stylizing or beautifying
   • Adding artistic effects
   • Cropping out garment parts

This is a TECHNICAL GARMENT ASSET for a virtual try-on system.
NOT a fashion photo. NOT stylized. EXACT reproduction only.`
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
  model?: 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview'
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
  model?: 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview'
}): Promise<GarmentExtractionResult> {
  const {
    clothingImageBase64,
    garmentAnalysis,
    model = 'gemini-3.1-flash-image-preview'
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
