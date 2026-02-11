import sharp from 'sharp'

interface FaceCropOutput {
    success: boolean
    faceCropBase64: string
}

/**
 * Extracts a face crop from the person image to use as a second reference for Gemini.
 * Since most input images are portraits/body shots, we take a center-top crop.
 * This reinforces facial identity without needing heavy face detection models.
 */
export async function extractFaceCrop(personImageBase64: string): Promise<FaceCropOutput> {
    try {
        const buffer = Buffer.from(personImageBase64.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64')
        const metadata = await sharp(buffer).metadata()

        if (!metadata.width || !metadata.height) {
            throw new Error('Invalid image metadata')
        }

        // HEURISTIC: Face is usually in the top center of the image.
        // We crop the top 40% of the image, centered horizontally.
        // This captures the head and shoulders, providing a strong identity signal.
        const cropWidth = Math.floor(metadata.width * 0.6) // 60% width
        const cropHeight = Math.floor(metadata.height * 0.4) // Top 40% height
        const left = Math.floor((metadata.width - cropWidth) / 2)
        const top = 0 // Start from top

        const croppedBuffer = await sharp(buffer)
            .extract({ left, top, width: cropWidth, height: cropHeight })
            .toFormat('jpeg')
            .toBuffer()

        return {
            success: true,
            faceCropBase64: croppedBuffer.toString('base64'),
        }
    } catch (error) {
        console.warn('Face crop extraction failed, falling back to original image only:', error)
        return {
            success: false,
            faceCropBase64: '',
        }
    }
}
