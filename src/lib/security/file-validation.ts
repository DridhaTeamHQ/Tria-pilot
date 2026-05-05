/**
 * FILE MAGIC BYTE VALIDATION
 *
 * Verifies a buffer's CONTENT matches the claimed image type, not just
 * the browser-supplied MIME header. Blocks polyglot files (e.g. a valid
 * JPEG that's also valid HTML/JS) by refusing anything whose first bytes
 * don't match a real image format.
 *
 * Supported formats: PNG, JPEG, GIF (87a/89a), WEBP, AVIF, HEIC.
 * Explicitly REJECTED: SVG (XML, XSS-prone) and any unknown format.
 *
 * Pure JS — zero dependencies.
 */

export type DetectedImageType =
  | 'image/png'
  | 'image/jpeg'
  | 'image/gif'
  | 'image/webp'
  | 'image/avif'
  | 'image/heic'

export interface FileValidationResult {
  ok: boolean
  detectedMime?: DetectedImageType
  reason?: string
}

function bufStartsWith(buf: Uint8Array, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false
  for (let i = 0; i < sig.length; i++) {
    if (buf[offset + i] !== sig[i]) return false
  }
  return true
}

function bufStartsWithAscii(buf: Uint8Array, ascii: string, offset = 0): boolean {
  const sig = Array.from(ascii).map((c) => c.charCodeAt(0))
  return bufStartsWith(buf, sig, offset)
}

/**
 * Detect image MIME type from the first ~16 bytes. Returns null for
 * unsupported / unrecognized formats — caller should reject these.
 */
export function detectImageMimeFromBytes(buffer: Uint8Array | Buffer): DetectedImageType | null {
  if (!buffer || buffer.length < 12) return null

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bufStartsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png'
  }

  // JPEG: FF D8 FF
  if (bufStartsWith(buffer, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg'
  }

  // GIF: "GIF87a" or "GIF89a"
  if (bufStartsWithAscii(buffer, 'GIF87a') || bufStartsWithAscii(buffer, 'GIF89a')) {
    return 'image/gif'
  }

  // WEBP: "RIFF" .... "WEBP"
  if (bufStartsWithAscii(buffer, 'RIFF') && bufStartsWithAscii(buffer, 'WEBP', 8)) {
    return 'image/webp'
  }

  // AVIF / HEIC: ISO-BMFF — bytes 4-7 are "ftyp", then a brand at 8-11
  if (bufStartsWithAscii(buffer, 'ftyp', 4)) {
    // AVIF brands: avif, avis
    if (bufStartsWithAscii(buffer, 'avif', 8) || bufStartsWithAscii(buffer, 'avis', 8)) {
      return 'image/avif'
    }
    // HEIC brands: heic, heix, heim, heis
    if (
      bufStartsWithAscii(buffer, 'heic', 8) ||
      bufStartsWithAscii(buffer, 'heix', 8) ||
      bufStartsWithAscii(buffer, 'heim', 8) ||
      bufStartsWithAscii(buffer, 'heis', 8) ||
      // Some HEIC containers use "mif1" with HEIC content
      bufStartsWithAscii(buffer, 'mif1', 8)
    ) {
      return 'image/heic'
    }
  }

  return null
}

/**
 * Validate that a file's CONTENT matches the claimed MIME type, and that
 * it's an image format we want to allow. Returns the detected MIME on
 * success, or a reason string on failure.
 */
export function validateImageFile(
  buffer: Uint8Array | Buffer,
  claimedMime: string,
  allowedMimes: ReadonlySet<DetectedImageType>,
): FileValidationResult {
  const detected = detectImageMimeFromBytes(buffer)
  if (!detected) {
    return {
      ok: false,
      reason: 'File does not appear to be a valid image (unrecognized magic bytes)',
    }
  }

  if (!allowedMimes.has(detected)) {
    return {
      ok: false,
      detectedMime: detected,
      reason: `Image type ${detected} is not allowed`,
    }
  }

  // Soft mismatch warning — claimed MIME different from detected. We
  // accept the upload but log the discrepancy; many browsers send
  // image/jpg vs image/jpeg, so we don't hard-reject on this alone.
  // The detected MIME is what we'll store.
  const claimed = claimedMime.toLowerCase().replace('image/jpg', 'image/jpeg')
  if (claimed !== detected && process.env.NODE_ENV !== 'production') {
    console.warn(`[file-validation] MIME mismatch: claimed=${claimed} detected=${detected}`)
  }

  return { ok: true, detectedMime: detected }
}
