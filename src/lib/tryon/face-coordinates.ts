/**
 * FACE COORDINATES DETECTOR
 *
 * Detects face bounding box coordinates in an image using Gemini Flash.
 * Returns normalised 0-1000 coordinates for the eye compositor to align
 * original eye pixels onto the generated image.
 *
 * Used by:
 * - nano-banana-pro-renderer.ts (detect face in original & generated)
 * - eye-compositor.ts (align and composite eyes)
 *
 * Approach: Ask Gemini Flash (vision) to return a face bounding box as JSON.
 * This is lightweight and does not require any external ML model.
 */

import 'server-only'
import sharp from 'sharp'
import { geminiGenerateContent } from '@/lib/gemini/executor'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface FaceCoordinates {
  /** Top boundary (0-1000 normalised) */
  ymin: number
  /** Left boundary (0-1000 normalised) */
  xmin: number
  /** Bottom boundary (0-1000 normalised) */
  ymax: number
  /** Right boundary (0-1000 normalised) */
  xmax: number
  /** Detection confidence (0-1) */
  confidence: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACE DETECTION PROMPT
// ═══════════════════════════════════════════════════════════════════════════════

const DETECT_PROMPT = `Detect the single most prominent human face in this image.
Return ONLY a JSON object with a normalized bounding box in 0..1000 coordinates.
Format: {"ymin": <0-1000>, "xmin": <0-1000>, "ymax": <0-1000>, "xmax": <0-1000>, "confidence": <0-1>}
If no face is found, return: {"ymin": 0, "xmin": 0, "ymax": 0, "xmax": 0, "confidence": 0}
Do not include any explanation, markdown, or text outside the JSON.`

async function getImageDimensions(base64: string): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(Buffer.from(base64, 'base64')).metadata()
    if (!metadata.width || !metadata.height) return null
    return { width: metadata.width, height: metadata.height }
  } catch {
    return null
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect face coordinates in an image using Gemini Flash (vision).
 *
 * @param imageBase64 - Base64 image (with or without data URI prefix)
 * @returns FaceCoordinates or null if detection fails
 */
export async function detectFaceCoordinates(
  imageBase64: string
): Promise<FaceCoordinates | null> {
  try {
    // Strip data URI prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')

    if (!cleanBase64 || cleanBase64.length < 100) {
      console.warn('⚠️ Face detect: invalid image data')
      return null
    }

    const response = await geminiGenerateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanBase64,
              },
            },
            { text: DETECT_PROMPT },
          ],
        },
      ],
      config: {
        temperature: 0.0,
        maxOutputTokens: 128,
        responseMimeType: 'application/json',
      },
    })

    // Extract text response
    let text = ''
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content?.parts
      if (parts) {
        for (const part of parts) {
          if (part.text) {
            text += part.text
          }
        }
      }
    }

    if (!text) {
      console.warn('⚠️ Face detect: empty response from Gemini')
      return null
    }

    // Parse JSON from response (handle fenced markdown and partial wrappers)
    const cleanedText = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim()

    const firstBrace = cleanedText.indexOf('{')
    const lastBrace = cleanedText.lastIndexOf('}')

    let raw: any
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        raw = JSON.parse(cleanedText.slice(firstBrace, lastBrace + 1))
      } catch {
        raw = null
      }
    }

    if (!raw) {
      // Fallback: extract numeric fields even if JSON is partial/truncated.
      const pick = (key: string): number | null => {
        const m = cleanedText.match(new RegExp(`"${key}"\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)`, 'i'))
        return m ? Number(m[1]) : null
      }

      const yminN = pick('ymin')
      const xminN = pick('xmin')
      const ymaxN = pick('ymax')
      const xmaxN = pick('xmax')
      const confidence = pick('confidence')

      if (yminN !== null && xminN !== null && ymaxN !== null && xmaxN !== null) {
        raw = {
          ymin: yminN,
          xmin: xminN,
          ymax: ymaxN,
          xmax: xmaxN,
          confidence: confidence ?? 1,
        }
      } else {
        const top = pick('top')
        const left = pick('left')
        let bottom = pick('bottom')
        let right = pick('right')
        let imgWidth = pick('img_width') ?? pick('imgWidth') ?? pick('width')
        let imgHeight = pick('img_height') ?? pick('imgHeight') ?? pick('height')

        if ((imgWidth === null || imgHeight === null) && (top !== null || left !== null || bottom !== null || right !== null)) {
          const dims = await getImageDimensions(cleanBase64)
          imgWidth = imgWidth ?? dims?.width ?? null
          imgHeight = imgHeight ?? dims?.height ?? null
        }

        if (top === null || left === null || imgWidth === null || imgHeight === null) {
          console.warn('⚠️ Face detect: no recoverable JSON in response:', cleanedText.substring(0, 120))
          return null
        }
        // If response was truncated (e.g. missing bottom/right), infer a plausible face box so we don't trigger false "face missing" retries.
        if (imgWidth > 0 && imgHeight > 0) {
          const defaultFaceH = Math.round(0.22 * imgHeight)
          const defaultFaceW = Math.round(0.18 * imgWidth)
          if (bottom === null) bottom = Math.min(top + defaultFaceH, imgHeight)
          if (right === null) right = Math.min(left + defaultFaceW, imgWidth)
        }
        if (bottom === null || right === null) {
          console.warn('⚠️ Face detect: no recoverable JSON in response:', cleanedText.substring(0, 120))
          return null
        }
        raw = {
          top,
          left,
          bottom,
          right,
          img_width: imgWidth,
          img_height: imgHeight,
        }
      }
    }
    console.log('   Raw face detect JSON:', JSON.stringify(raw))

    let ymin: number, xmin: number, ymax: number, xmax: number
    if (
      raw.ymin !== undefined &&
      raw.xmin !== undefined &&
      raw.ymax !== undefined &&
      raw.xmax !== undefined
    ) {
      // Already normalised 0-1000 format
      ymin = Number(raw.ymin)
      xmin = Number(raw.xmin)
      ymax = Number(raw.ymax)
      xmax = Number(raw.xmax)
    } else {
      // Convert pixel coordinates → normalised 0-1000
      // Accept multiple key formats Gemini might return
      const imgW = Number(raw.img_width || raw.imgWidth || raw.width || 0)
      const imgH = Number(raw.img_height || raw.imgHeight || raw.height || 0)
      if (!(imgW > 0 && imgH > 0)) {
        console.warn('⚠️ Face detect: unrecognised coordinate format')
        return null
      }
      // Pixel coordinates → normalise to 0-1000
      const top = Number(raw.top ?? raw.ymin ?? raw.y ?? 0)
      const left = Number(raw.left ?? raw.xmin ?? raw.x ?? 0)
      const bottom = Number(raw.bottom ?? raw.ymax ?? 0)
      const right = Number(raw.right ?? raw.xmax ?? 0)

      ymin = Math.round((top / imgH) * 1000)
      xmin = Math.round((left / imgW) * 1000)
      ymax = Math.round((bottom / imgH) * 1000)
      xmax = Math.round((right / imgW) * 1000)
    }

    // Reject NaN values
    if ([ymin, xmin, ymax, xmax].some(v => isNaN(v))) {
      console.warn('⚠️ Face detect: NaN in coordinates after parsing')
      return null
    }

    // Clamp to 0-1000
    ymin = Math.max(0, Math.min(1000, ymin))
    xmin = Math.max(0, Math.min(1000, xmin))
    ymax = Math.max(0, Math.min(1000, ymax))
    xmax = Math.max(0, Math.min(1000, xmax))

    // Validate box makes sense
    if (ymax <= ymin || xmax <= xmin) {
      console.warn('⚠️ Face detect: invalid box (zero or negative area)')
      return null
    }

    const result: FaceCoordinates = {
      ymin,
      xmin,
      ymax,
      xmax,
      confidence: 1.0,
    }

    console.log(
      `👤 Face detected: [${result.ymin},${result.xmin}]-[${result.ymax},${result.xmax}] conf=${result.confidence.toFixed(2)}`
    )

    return result
  } catch (error) {
    console.error('⚠️ Face coordinate detection failed:', error)
    return null
  }
}
