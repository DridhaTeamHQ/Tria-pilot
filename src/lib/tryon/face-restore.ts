/**
 * FACE RESTORATION (Stage 4)
 *
 * Two-Pass Gemini approach to face preservation:
 *  Pass 1: Normal try-on generation (existing pipeline)
 *  Pass 2: This module — inpaints the face region using the original person
 *          photo as reference, preserving exact facial identity.
 *
 * Uses the same Gemini infrastructure (executor.ts) with:
 *  - Generated image as the base
 *  - Elliptical mask over the detected face region (with padding)
 *  - Original person photo as identity reference
 *  - Strict identity-locking prompt
 */

import 'server-only'
import sharp from 'sharp'
import { geminiGenerateContent } from '@/lib/gemini/executor'
import type { GenerateContentConfig } from '@google/genai'
import type { FaceCoordinates } from './face-coordinates'

// IMPORTANT: Must be an image-capable model (supports responseModalities: ['IMAGE'])
// Only these models can output images:
//  - gemini-3-pro-image-preview  (Pro — highest quality, slower)
//  - gemini-2.5-flash-image      (Flash — faster, good quality)
// Models like gemini-2.0-flash or gemini-2.5-flash-preview are TEXT-ONLY output.
const FACE_RESTORE_MODEL = 'gemini-2.5-flash-image' as const

// Padding multiplier around the detected face box (1.0 = exact box, 1.4 = 40% larger)
const FACE_MASK_PADDING = 1.35
// Feather radius as a fraction of face size (for smooth blending)
const FEATHER_FRACTION = 0.15

export interface FaceRestoreInput {
    /** Generated try-on image (base64 data URL or raw base64) */
    generatedImageBase64: string
    /** Original person photo (base64 data URL or raw base64) */
    personImageBase64: string
    /** Face crop for close-up reference (base64 data URL or raw base64) */
    faceCropBase64?: string
    /** Detected face coordinates in the generated image */
    generatedFace: FaceCoordinates
    /** Detected face coordinates in the original person image */
    personFace: FaceCoordinates
    /** Aspect ratio of the generated image */
    aspectRatio?: string
}

export interface FaceRestoreResult {
    success: boolean
    restoredImageBase64: string
    processingTimeMs: number
    error?: string
}

function cleanBase64(dataUrlOrBase64: string): string {
    return dataUrlOrBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
}

function toBuffer(dataUrlOrBase64: string): Buffer {
    return Buffer.from(cleanBase64(dataUrlOrBase64), 'base64')
}

/**
 * Create an elliptical face mask with soft feathered edges.
 * The mask is WHITE over the face region (edit area) and BLACK elsewhere (preserve area).
 */
async function createFaceMask(
    imageWidth: number,
    imageHeight: number,
    face: FaceCoordinates
): Promise<Buffer> {
    const faceW = face.xmax - face.xmin
    const faceH = face.ymax - face.ymin
    const faceCenterX = face.xmin + faceW / 2
    const faceCenterY = face.ymin + faceH / 2

    // Apply padding — expand the region to include forehead, ears, and chin
    const radiusX = Math.round((faceW / 2) * FACE_MASK_PADDING)
    const radiusY = Math.round((faceH / 2) * FACE_MASK_PADDING)

    // Feather blur for seamless blending
    const featherRadius = Math.round(Math.min(faceW, faceH) * FEATHER_FRACTION)

    // Build SVG mask: black background, white ellipse over face
    const svg = `
    <svg width="${imageWidth}" height="${imageHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="feather">
          <feGaussianBlur stdDeviation="${featherRadius}" />
        </filter>
      </defs>
      <rect x="0" y="0" width="${imageWidth}" height="${imageHeight}" fill="black" />
      <ellipse 
        cx="${Math.round(faceCenterX)}" 
        cy="${Math.round(faceCenterY)}" 
        rx="${radiusX}" 
        ry="${radiusY}" 
        fill="white" 
        filter="url(#feather)"
      />
    </svg>
  `.trim()

    return sharp(Buffer.from(svg)).png().toBuffer()
}

/**
 * Build the face restoration prompt.
 * Concise, identity-focused, minimal — following the same philosophy as forensic-prompt.
 */
function buildFaceRestorePrompt(hasFaceCrop: boolean): string {
    const lines = [
        'You are performing a FACE IDENTITY RESTORATION edit.',
        '',
        'Image 1 is a generated try-on photo. The face may have drifted from the original person.',
        'Image 2 is a mask showing the FACE REGION to restore (white = edit zone).',
        hasFaceCrop
            ? 'Image 3 is the ORIGINAL person photo. Image 4 is a close-up crop of the original face.'
            : 'Image 3 is the ORIGINAL person photo with the true face identity.',
        '',
        'YOUR TASK:',
        '- Replace the face in Image 1\'s masked region with the EXACT face from the reference.',
        '- Match the EXACT bone structure, eye shape, eye spacing, nose, lips, jawline, skin texture, pores, skin tone, and perceived age.',
        '- Adapt lighting and color grading of the restored face to match the surrounding scene in Image 1.',
        '- Blend seamlessly at mask edges — no visible seam or halo.',
        '- Do NOT alter anything outside the mask region.',
        '- Do NOT beautify, smooth skin, or reshape any facial features.',
        '- Preserve the head angle and gaze direction from Image 1, but use facial IDENTITY from the reference.',
        '',
        'OUTPUT: The complete Image 1 with only the face region restored. Everything else stays identical.',
    ]
    return lines.join('\n')
}

/**
 * STAGE 4: Face Restoration via Gemini Inpainting
 *
 * Takes the generated try-on image and restores the original face identity
 * by inpainting only the face region using the original person photo as reference.
 */
export async function restoreFaceIdentity(
    input: FaceRestoreInput
): Promise<FaceRestoreResult> {
    const startTime = Date.now()
    const isDev = process.env.NODE_ENV !== 'production'

    try {
        if (isDev) console.log('\n━━━ STAGE 4: Face Identity Restoration ━━━')

        // Get image dimensions
        const genBuffer = toBuffer(input.generatedImageBase64)
        const metadata = await sharp(genBuffer).metadata()
        const imageWidth = metadata.width || 1024
        const imageHeight = metadata.height || 1024

        if (isDev) console.log(`   Image: ${imageWidth}x${imageHeight}`)
        if (isDev) console.log(`   Face box: [${input.generatedFace.ymin},${input.generatedFace.xmin}]-[${input.generatedFace.ymax},${input.generatedFace.xmax}]`)

        // Create face mask
        const maskBuffer = await createFaceMask(imageWidth, imageHeight, input.generatedFace)
        const maskBase64 = maskBuffer.toString('base64')

        if (isDev) console.log('   ✓ Face mask created')

        // Prepare reference images
        const genBase64 = cleanBase64(input.generatedImageBase64)
        const personBase64 = cleanBase64(input.personImageBase64)
        const hasFaceCrop = Boolean(input.faceCropBase64)
        const faceCropBase64 = input.faceCropBase64 ? cleanBase64(input.faceCropBase64) : null

        // Build the identity restoration prompt
        const prompt = buildFaceRestorePrompt(hasFaceCrop)

        if (isDev) console.log(`   Prompt: ${prompt.length} chars`)

        // Assemble content parts: generated image, mask, person reference, [face crop], prompt
        const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [
            { inlineData: { mimeType: 'image/png', data: genBase64 } },       // Image 1: Generated
            { inlineData: { mimeType: 'image/png', data: maskBase64 } },      // Image 2: Face mask
            { inlineData: { mimeType: 'image/jpeg', data: personBase64 } },   // Image 3: Original person
        ]

        if (faceCropBase64) {
            parts.push(
                { inlineData: { mimeType: 'image/jpeg', data: faceCropBase64 } } // Image 4: Face crop
            )
        }

        // Prompt MUST be a {text:...} object, NOT a raw string
        parts.push({ text: prompt })

        // Call Gemini for face restoration
        const config: GenerateContentConfig = {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 0.25, // Low temperature for consistency
            topP: 0.85,
            topK: 20,
        }

        if (isDev) console.log(`   🎯 Calling ${FACE_RESTORE_MODEL} for face inpainting...`)

        const response = await geminiGenerateContent({
            model: FACE_RESTORE_MODEL,
            contents: [{ role: 'user', parts: parts as any }],
            config,
        })

        // Extract restored image from response
        const responseParts: any[] = response.candidates?.[0]?.content?.parts || []
        for (const part of responseParts) {
            if (part.inlineData?.data) {
                const mimeType = part.inlineData.mimeType || 'image/png'
                const restoredBase64 = `data:${mimeType};base64,${part.inlineData.data}`

                const elapsed = Date.now() - startTime
                if (isDev) console.log(`   ✓ Face restored in ${(elapsed / 1000).toFixed(1)}s`)

                return {
                    success: true,
                    restoredImageBase64: restoredBase64,
                    processingTimeMs: elapsed,
                }
            }
        }

        // No image in response
        const textPart = responseParts.find((p: any) => p.text)?.text
        throw new Error(textPart || 'Gemini did not return a restored image')

    } catch (error) {
        const elapsed = Date.now() - startTime
        console.error('❌ Face restoration failed:', error)
        return {
            success: false,
            restoredImageBase64: '',
            processingTimeMs: elapsed,
            error: error instanceof Error ? error.message : String(error),
        }
    }
}
