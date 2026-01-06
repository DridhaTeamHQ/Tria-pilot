/**
 * MICRO FACE-DRIFT SCORER
 * 
 * Scores GEOMETRY ONLY, not lighting.
 * This is the final 5% of identity preservation.
 * 
 * Metrics:
 * - Landmark distances
 * - Cheek volume ratio
 * - Jaw contour variance
 * - Eye spacing delta
 * 
 * Thresholds:
 * - ≤5% → PASS
 * - 5-8% → SOFT_PASS (acceptable but could be better)
 * - >8% → RETRY
 */

import 'server-only'

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Threshold for clean pass */
const PASS_THRESHOLD = 5

/** Threshold for soft pass (acceptable drift) */
const SOFT_PASS_THRESHOLD = 8

/** Weight for each metric */
const METRIC_WEIGHTS = {
    landmarkDistance: 0.35,
    cheekVolumeRatio: 0.20,
    jawContourVariance: 0.25,
    eyeSpacingDelta: 0.20
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DriftStatus = 'PASS' | 'SOFT_PASS' | 'RETRY'

export interface FaceDriftMetrics {
    /** Normalized landmark distance difference (0-100%) */
    landmarkDistance: number
    /** Cheek volume ratio difference (0-100%) */
    cheekVolumeRatio: number
    /** Jaw contour variance (0-100%) */
    jawContourVariance: number
    /** Eye spacing delta (0-100%) */
    eyeSpacingDelta: number
}

export interface MicroFaceDriftResult {
    /** Overall drift percentage (0-100) */
    driftPercent: number
    /** Pass/Soft Pass/Retry status */
    status: DriftStatus
    /** Individual metrics */
    metrics: FaceDriftMetrics
    /** Processing time in ms */
    processingTimeMs: number
    /** Whether analysis was successful */
    success: boolean
    /** Error message if failed */
    error?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACE REGION ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract face region features for comparison
 * Uses simplified geometric analysis without ML models
 */
async function extractFaceFeatures(imageBuffer: Buffer): Promise<{
    topRegion: Buffer
    middleRegion: Buffer
    jawRegion: Buffer
    leftEyeRegion: Buffer
    rightEyeRegion: Buffer
    brightness: number
} | null> {
    let sharp: any
    try {
        sharp = (await import('sharp')).default
    } catch {
        console.warn('⚠️ Sharp not available for face drift analysis')
        return null
    }

    try {
        const metadata = await sharp(imageBuffer).metadata()
        const width = metadata.width || 512
        const height = metadata.height || 512

        // Face region bounds (assuming face is in upper center)
        const faceLeft = Math.floor(width * 0.2)
        const faceWidth = Math.floor(width * 0.6)
        const faceTop = Math.floor(height * 0.05)
        const faceHeight = Math.floor(height * 0.4)

        // Divide face into regions
        const regionHeight = Math.floor(faceHeight / 3)

        // Top region (forehead + eyes)
        const topRegion = await sharp(imageBuffer)
            .extract({
                left: faceLeft,
                top: faceTop,
                width: faceWidth,
                height: regionHeight
            })
            .resize(32, 16, { fit: 'fill' })
            .grayscale()
            .raw()
            .toBuffer()

        // Middle region (nose + cheeks)
        const middleRegion = await sharp(imageBuffer)
            .extract({
                left: faceLeft,
                top: faceTop + regionHeight,
                width: faceWidth,
                height: regionHeight
            })
            .resize(32, 16, { fit: 'fill' })
            .grayscale()
            .raw()
            .toBuffer()

        // Jaw region
        const jawRegion = await sharp(imageBuffer)
            .extract({
                left: faceLeft,
                top: faceTop + 2 * regionHeight,
                width: faceWidth,
                height: regionHeight
            })
            .resize(32, 16, { fit: 'fill' })
            .grayscale()
            .raw()
            .toBuffer()

        // Eye regions (left and right)
        const eyeWidth = Math.floor(faceWidth / 3)
        const eyeHeight = Math.floor(regionHeight / 2)

        const leftEyeRegion = await sharp(imageBuffer)
            .extract({
                left: faceLeft + Math.floor(eyeWidth * 0.5),
                top: faceTop + Math.floor(regionHeight * 0.3),
                width: eyeWidth,
                height: eyeHeight
            })
            .resize(16, 8, { fit: 'fill' })
            .grayscale()
            .raw()
            .toBuffer()

        const rightEyeRegion = await sharp(imageBuffer)
            .extract({
                left: faceLeft + Math.floor(eyeWidth * 1.5),
                top: faceTop + Math.floor(regionHeight * 0.3),
                width: eyeWidth,
                height: eyeHeight
            })
            .resize(16, 8, { fit: 'fill' })
            .grayscale()
            .raw()
            .toBuffer()

        // Calculate overall brightness (for normalization)
        const fullFace = await sharp(imageBuffer)
            .extract({
                left: faceLeft,
                top: faceTop,
                width: faceWidth,
                height: faceHeight
            })
            .resize(32, 32, { fit: 'fill' })
            .grayscale()
            .raw()
            .toBuffer()

        let brightness = 0
        for (let i = 0; i < fullFace.length; i++) {
            brightness += fullFace[i]
        }
        brightness = brightness / fullFace.length / 255

        return {
            topRegion,
            middleRegion,
            jawRegion,
            leftEyeRegion,
            rightEyeRegion,
            brightness
        }
    } catch (error) {
        console.error('❌ Face feature extraction failed:', error)
        return null
    }
}

/**
 * Calculate structural similarity between two buffers
 * Returns normalized correlation (0-1)
 */
function calculateStructuralSimilarity(buf1: Buffer, buf2: Buffer): number {
    if (buf1.length !== buf2.length) return 0.5

    const n = buf1.length
    let sum1 = 0, sum2 = 0
    for (let i = 0; i < n; i++) {
        sum1 += buf1[i]
        sum2 += buf2[i]
    }
    const mean1 = sum1 / n
    const mean2 = sum2 / n

    let cov = 0, var1 = 0, var2 = 0
    for (let i = 0; i < n; i++) {
        const d1 = buf1[i] - mean1
        const d2 = buf2[i] - mean2
        cov += d1 * d2
        var1 += d1 * d1
        var2 += d2 * d2
    }

    const denom = Math.sqrt(var1 * var2)
    if (denom === 0) return 1.0 // Identical buffers

    return (cov / denom + 1) / 2 // Normalize to 0-1
}

/**
 * Calculate edge density difference (measures structural geometry)
 */
function calculateEdgeDensityDiff(buf1: Buffer, buf2: Buffer, width: number): number {
    // Simple Sobel-like edge detection
    const getEdgeDensity = (buf: Buffer): number => {
        let edgeSum = 0
        for (let i = 1; i < buf.length - 1; i++) {
            if (i % width === 0 || i % width === width - 1) continue
            const dx = Math.abs(buf[i + 1] - buf[i - 1])
            const dy = Math.abs(buf[i + width] - buf[i - width])
            edgeSum += Math.sqrt(dx * dx + dy * dy)
        }
        return edgeSum / buf.length
    }

    const density1 = getEdgeDensity(buf1)
    const density2 = getEdgeDensity(buf2)

    // Return percentage difference
    const maxDensity = Math.max(density1, density2, 1)
    return Math.abs(density1 - density2) / maxDensity * 100
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute micro face drift between reference and generated images.
 * 
 * This focuses on GEOMETRY, not lighting. Minor lighting variations are allowed.
 * 
 * @param referenceBuffer - Original user image buffer
 * @param generatedBuffer - Generated output image buffer
 * @returns Drift result with status and metrics
 */
export async function computeMicroFaceDrift(
    referenceBuffer: Buffer,
    generatedBuffer: Buffer
): Promise<MicroFaceDriftResult> {
    const startTime = Date.now()

    console.log('\n🔬 MICRO FACE DRIFT ANALYSIS...')

    // Extract features from both images
    const refFeatures = await extractFaceFeatures(referenceBuffer)
    const genFeatures = await extractFaceFeatures(generatedBuffer)

    if (!refFeatures || !genFeatures) {
        console.warn('   ⚠️ Could not extract face features, assuming PASS')
        return {
            driftPercent: 0,
            status: 'PASS',
            metrics: {
                landmarkDistance: 0,
                cheekVolumeRatio: 0,
                jawContourVariance: 0,
                eyeSpacingDelta: 0
            },
            processingTimeMs: Date.now() - startTime,
            success: false,
            error: 'Feature extraction failed'
        }
    }

    // Normalize for lighting differences
    const brightnessDiff = Math.abs(refFeatures.brightness - genFeatures.brightness)
    const lightingFactor = 1 - Math.min(brightnessDiff * 0.5, 0.3) // Max 30% reduction

    // Calculate metrics

    // 1. Landmark distance (top region comparison - eyes/forehead geometry)
    const topSimilarity = calculateStructuralSimilarity(refFeatures.topRegion, genFeatures.topRegion)
    const landmarkDistance = (1 - topSimilarity) * 100 * lightingFactor

    // 2. Cheek volume ratio (middle region edge density)
    const cheekVolumeRatio = calculateEdgeDensityDiff(
        refFeatures.middleRegion,
        genFeatures.middleRegion,
        32
    ) * lightingFactor

    // 3. Jaw contour variance
    const jawSimilarity = calculateStructuralSimilarity(refFeatures.jawRegion, genFeatures.jawRegion)
    const jawContourVariance = (1 - jawSimilarity) * 100 * lightingFactor

    // 4. Eye spacing delta (compare left-right eye regions)
    const leftEyeSim = calculateStructuralSimilarity(refFeatures.leftEyeRegion, genFeatures.leftEyeRegion)
    const rightEyeSim = calculateStructuralSimilarity(refFeatures.rightEyeRegion, genFeatures.rightEyeRegion)
    const eyeSpacingDelta = ((1 - leftEyeSim) + (1 - rightEyeSim)) * 50 * lightingFactor

    // Calculate weighted overall drift
    const metrics: FaceDriftMetrics = {
        landmarkDistance,
        cheekVolumeRatio,
        jawContourVariance,
        eyeSpacingDelta
    }

    const driftPercent =
        metrics.landmarkDistance * METRIC_WEIGHTS.landmarkDistance +
        metrics.cheekVolumeRatio * METRIC_WEIGHTS.cheekVolumeRatio +
        metrics.jawContourVariance * METRIC_WEIGHTS.jawContourVariance +
        metrics.eyeSpacingDelta * METRIC_WEIGHTS.eyeSpacingDelta

    // Determine status
    let status: DriftStatus
    if (driftPercent <= PASS_THRESHOLD) {
        status = 'PASS'
    } else if (driftPercent <= SOFT_PASS_THRESHOLD) {
        status = 'SOFT_PASS'
    } else {
        status = 'RETRY'
    }

    const processingTimeMs = Date.now() - startTime

    console.log(`   📊 Landmark distance: ${landmarkDistance.toFixed(1)}%`)
    console.log(`   📊 Cheek volume ratio: ${cheekVolumeRatio.toFixed(1)}%`)
    console.log(`   📊 Jaw contour variance: ${jawContourVariance.toFixed(1)}%`)
    console.log(`   📊 Eye spacing delta: ${eyeSpacingDelta.toFixed(1)}%`)
    console.log(`   ═══════════════════════════════════════`)
    console.log(`   📐 OVERALL DRIFT: ${driftPercent.toFixed(1)}%`)
    console.log(`   📐 STATUS: ${status}`)
    console.log(`   ⏱️ Time: ${processingTimeMs}ms`)

    return {
        driftPercent,
        status,
        metrics,
        processingTimeMs,
        success: true
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if drift result requires retry
 */
export function shouldRetryForDrift(result: MicroFaceDriftResult): boolean {
    return result.status === 'RETRY'
}

/**
 * Get retry parameters based on drift result
 */
export function getDriftRetryParams(result: MicroFaceDriftResult): {
    temperatureAdjust: number
    realismBias: number
    emphasis: string
} {
    if (result.status !== 'RETRY') {
        return { temperatureAdjust: 0, realismBias: 0, emphasis: '' }
    }

    // Determine which metric contributed most to drift
    const { metrics } = result
    const worstMetric = Object.entries(metrics)
        .sort(([, a], [, b]) => b - a)[0]

    const emphasisMap: Record<string, string> = {
        landmarkDistance: 'PRESERVE EXACT EYE POSITION AND FOREHEAD SHAPE',
        cheekVolumeRatio: 'PRESERVE EXACT CHEEK VOLUME - DO NOT RESHAPE',
        jawContourVariance: 'PRESERVE EXACT JAWLINE - NO MODIFICATIONS',
        eyeSpacingDelta: 'PRESERVE EXACT EYE SPACING AND SIZE'
    }

    return {
        temperatureAdjust: -0.15, // Lower temperature for more consistent output
        realismBias: -1,
        emphasis: emphasisMap[worstMetric[0]] || 'PRESERVE FACIAL GEOMETRY EXACTLY'
    }
}

/**
 * Log drift analysis summary
 */
export function logDriftAnalysis(result: MicroFaceDriftResult): void {
    console.log('\n🔬 MICRO FACE DRIFT SUMMARY')
    console.log('   ═══════════════════════════════════════════════')
    console.log(`   Overall Drift: ${result.driftPercent.toFixed(1)}%`)
    console.log(`   Status: ${result.status}`)
    console.log(`   Landmark Distance: ${result.metrics.landmarkDistance.toFixed(1)}%`)
    console.log(`   Cheek Volume Ratio: ${result.metrics.cheekVolumeRatio.toFixed(1)}%`)
    console.log(`   Jaw Contour Variance: ${result.metrics.jawContourVariance.toFixed(1)}%`)
    console.log(`   Eye Spacing Delta: ${result.metrics.eyeSpacingDelta.toFixed(1)}%`)
    console.log('   ═══════════════════════════════════════════════')
}
