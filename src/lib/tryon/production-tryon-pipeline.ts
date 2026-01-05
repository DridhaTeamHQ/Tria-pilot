/**
 * PRODUCTION TRY-ON PIPELINE (ZERO FACE DRIFT ARCHITECTURE)
 * 
 * ========================================================================
 * !! IMPORTANT !!
 * Face pixels from Gemini are NEVER trusted.
 * ALL outputs are overwritten DETERMINISTICALLY with original face pixels.
 * This is NOT validation-based. This is CONSTRUCTION-based.
 * ========================================================================
 * 
 * ENGINEERING PHILOSOPHY:
 * - Gemini generates a draft image (face is garbage, will be overwritten)
 * - Original face pixels are PHYSICALLY COMPOSITED onto the output
 * - No validation, no retries based on similarity, no conditionals
 * - If face extraction fails → abort immediately
 * - If face composite fails → abort immediately (NEVER return raw Gemini output)
 * 
 * STAGES:
 * 0. Input Quality Gate → Validate input suitability (OPTIONAL)
 * 1. Face Freeze → Extract face pixels to buffer (CRITICAL)
 * 2. Prompt Generation → Build try-on prompt (OPTIONAL)
 * 3. Image Generation → Gemini generates draft (UNTRUSTED)
 * 4. FACE PIXEL OVERWRITE → Original face composited onto draft (MANDATORY)
 * 
 * DELETED STAGES (moved to post-validation, not generation):
 * - Stage 5: Body Proportion Enforcement (removed - causes retries)
 * - Stage 6: Face Similarity Validation (removed - pointless after pixel overwrite)
 * 
 * GENERATOR: Gemini 2.0 Flash Exp ONLY
 * FACE GENERATION: FORBIDDEN (overwritten anyway)
 * BODY RESHAPING: FORBIDDEN (in prompts only)
 */

import 'server-only'

// Stage imports
import {
    runInputQualityGate,
    logQualityGateStatus,
    type QualityCheckResult
} from './input-quality-gate'

// FACE PIXEL COPY — THE ONLY FACE AUTHORITY
import {
    extractFacePixels,
    compositeFacePixels,
    estimateFaceBox,
    logFacePixelCopyStatus,
    type FacePixelData,
    type PixelCopyResult,
    type FaceBox
} from './face-pixel-copy'

import {
    generateStrictTryOnPrompt,
    buildFinalGenerationPrompt,
    logPromptGeneratorStatus,
    type GeneratedPrompt
} from './strict-prompt-generator'

// NANO BANANA PRO - SOLE IMAGE GENERATOR (UNTRUSTED FOR FACE)
import {
    generateWithNanoBanana,
    logNanoBananaStatus,
    type NanoBananaResult,
    type QualityTier
} from './nano-banana-generator'

// Phase-2: Environment & Lighting Refinement (Optional)
import {
    refineEnvironmentAndLighting,
    logRefinementStatus,
    type RefinementResult
} from './environment-refinement'

// Phase-3: Perceptual Locks (Entropy Reduction)
import {
    buildPerceptualLockPrompt,
    logPerceptualLockStatus,
    validatePresetAgainstLocks,
    type PerceptualLockConfig
} from './perceptual-locks'

// Phase-4: Model-Agnostic Face Freeze (Flash = Pro = Same Face)
import {
    freezeFaceForModel,
    MODEL_AGNOSTIC_FACE_PROMPT,
    type FaceFreezeResult
} from './model-agnostic-face-freeze'

// Phase-5: Scene Authority (Prevent scene switching)
import {
    resolveSceneAuthority,
    buildSceneAuthorityPromptBlock,
    buildSceneAuthorityTextBlock
} from './scene-authority-resolver'
import type { SceneAuthority } from './scene-authority.schema'

// Types
export interface ProductionPipelineInput {
    personImageBase64: string
    garmentImageBase64: string
    sceneDescription?: string
    preset?: {
        id?: string
        background_name?: string
        lighting_name?: string
    }
    userRequest?: string
    enableRefinement?: boolean    // Enable Phase-2 lighting refinement
    skipQualityGate?: boolean     // Skip Stage 0 for faster generation
}

export interface StageResult {
    stage: number
    name: string
    status: 'PASS' | 'FAIL' | 'SKIP'
    timeMs: number
    data?: any
}

export interface ProductionPipelineResult {
    success: boolean
    image: string                    // Final composited image (FACE ALWAYS OVERWRITTEN)
    status: 'PASS' | 'FAIL'          // Simplified: either succeeded or failed
    warnings: string[]               // Any warnings for the user
    debug: {
        stages: StageResult[]          // Details for each stage
        totalTimeMs: number
        faceOverwritten: boolean       // ALWAYS true if successful
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Convert Base64 to Buffer
// ═══════════════════════════════════════════════════════════════════════════════

function base64ToBuffer(base64: string): Buffer {
    // Remove data URI prefix if present
    const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
    return Buffer.from(base64Data, 'base64')
}

function bufferToBase64(buffer: Buffer): string {
    return `data:image/png;base64,${buffer.toString('base64')}`
}

/**
 * Run the production try-on pipeline
 * 
 * GUARANTEE: If this returns success=true, the face pixels are from the original image.
 * 
 * @param input Pipeline input with person and garment images
 * @returns Pipeline result with final image and status
 */
export async function runProductionTryOnPipeline(
    input: ProductionPipelineInput
): Promise<ProductionPipelineResult> {
    const startTime = Date.now()
    const sessionId = `prod-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    console.log('\n')
    console.log('╔═══════════════════════════════════════════════════════════════════════════════╗')
    console.log('║                                                                               ║')
    console.log('║   🎯 PRODUCTION PIPELINE — ZERO FACE DRIFT ARCHITECTURE                      ║')
    console.log('║   Generator: Gemini 2.0 Flash Exp (UNTRUSTED for face)                       ║')
    console.log('║   Face Authority: SHARP PIXEL OVERWRITE (deterministic)                      ║')
    console.log('║   Validation: NONE (face is overwritten, not validated)                      ║')
    console.log('║                                                                               ║')
    console.log(`║   Session: ${sessionId.padEnd(63)}║`)
    console.log('║                                                                               ║')
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝')
    console.log('\n')

    logFacePixelCopyStatus()

    const stages: StageResult[] = []
    const warnings: string[] = []
    let facePixelData: FacePixelData | null = null
    let generatedImage: NanoBananaResult | null = null
    let compositeResult: PixelCopyResult | null = null
    let finalImage = ''

    try {
        // ═══════════════════════════════════════════════════════════════
        // STAGE 0: INPUT QUALITY GATE (OPTIONAL — skippable for speed)
        // ═══════════════════════════════════════════════════════════════
        if (!input.skipQualityGate) {
            const stage0Start = Date.now()
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log('  STAGE 0: INPUT QUALITY GATE (Optional)')
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

            try {
                const qualityResult = await runInputQualityGate(input.personImageBase64)
                logQualityGateStatus(sessionId, qualityResult)

                stages.push({
                    stage: 0,
                    name: 'Input Quality Gate',
                    status: qualityResult.isValid ? 'PASS' : 'FAIL',
                    timeMs: Date.now() - stage0Start,
                    data: { issues: qualityResult.issues }
                })

                if (!qualityResult.isValid) {
                    warnings.push(...qualityResult.issues)
                    // Only abort for critical issues (no face)
                    if (!qualityResult.checks.faceVisible) {
                        return {
                            success: false,
                            image: '',
                            status: 'FAIL',
                            warnings: ['No face detected in input image. Please upload a photo with a clear, visible face.'],
                            debug: { stages, totalTimeMs: Date.now() - startTime, faceOverwritten: false }
                        }
                    }
                }
            } catch (qualityError) {
                console.warn('⚠️ Quality gate failed, continuing anyway:', qualityError)
                stages.push({
                    stage: 0,
                    name: 'Input Quality Gate',
                    status: 'SKIP',
                    timeMs: Date.now() - stage0Start,
                    data: { error: 'OpenAI unavailable' }
                })
            }
        } else {
            stages.push({
                stage: 0,
                name: 'Input Quality Gate',
                status: 'SKIP',
                timeMs: 0,
                data: { reason: 'Skipped by user request' }
            })
        }

        // ═══════════════════════════════════════════════════════════════
        // STAGE 1: FACE PIXEL EXTRACTION — CRITICAL (NO FALLBACK)
        // ═══════════════════════════════════════════════════════════════
        const stage1Start = Date.now()
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('  STAGE 1: FACE PIXEL EXTRACTION (Sharp)')
        console.log('  🔴 CRITICAL: If this fails, pipeline ABORTS')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        const originalImageBuffer = base64ToBuffer(input.personImageBase64)

        // Extract face pixels — this is our ONLY source of truth for face
        facePixelData = await extractFacePixels(originalImageBuffer)

        if (!facePixelData) {
            console.error('❌ CRITICAL FAILURE: Cannot extract face pixels')
            console.error('   Pipeline CANNOT proceed without face data')

            stages.push({
                stage: 1,
                name: 'Face Pixel Extraction',
                status: 'FAIL',
                timeMs: Date.now() - stage1Start,
                data: { error: 'Face extraction failed' }
            })

            return {
                success: false,
                image: '',
                status: 'FAIL',
                warnings: ['Failed to extract face from input image. Ensure the face is clearly visible.'],
                debug: { stages, totalTimeMs: Date.now() - startTime, faceOverwritten: false }
            }
        }

        console.log(`   ✅ Face pixels extracted: ${facePixelData.box.width}x${facePixelData.box.height}`)
        console.log(`   📍 Position: (${facePixelData.box.x}, ${facePixelData.box.y})`)
        console.log(`   🔒 These pixels will be composited onto final output`)

        stages.push({
            stage: 1,
            name: 'Face Pixel Extraction',
            status: 'PASS',
            timeMs: Date.now() - stage1Start,
            data: { box: facePixelData.box }
        })

        // ═══════════════════════════════════════════════════════════════
        // STAGE 1.5: SCENE AUTHORITY DETECTION (Prevents scene switching)
        // ═══════════════════════════════════════════════════════════════
        const stage15Start = Date.now()
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('  STAGE 1.5: SCENE AUTHORITY DETECTION')
        console.log('  🎬 Detecting indoor/outdoor and lighting to prevent scene switching')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        let sceneAuthority: SceneAuthority
        try {
            sceneAuthority = await resolveSceneAuthority(originalImageBuffer)

            stages.push({
                stage: 1.5,
                name: 'Scene Authority Detection',
                status: 'PASS',
                timeMs: Date.now() - stage15Start,
                data: {
                    environment: sceneAuthority.detected_scene.environment,
                    confidence: sceneAuthority.detected_scene.confidence,
                    lighting: sceneAuthority.lighting_profile.type
                }
            })
        } catch (sceneError) {
            console.warn('⚠️ Scene detection failed, using strict defaults')
            sceneAuthority = {
                authority_source: { mode: 'inherit', primary_image_index: 1 },
                detected_scene: { environment: 'unknown', confidence: 0, indicators: [] },
                scene_rules: { background_consistency: 'strict', lighting_consistency: 'strict', allow_scene_change: false },
                lighting_profile: { type: 'daylight', color_temperature_kelvin: 5500, direction: 'front', intensity: 'normal' },
                enforcement: { forbid_scene_switch: true, forbid_indoor_outdoor_mix: true, max_lighting_delta: 12 }
            }

            stages.push({
                stage: 1.5,
                name: 'Scene Authority Detection',
                status: 'SKIP',
                timeMs: Date.now() - stage15Start,
                data: { error: 'Using strict defaults' }
            })
        }

        // ═══════════════════════════════════════════════════════════════
        // STAGE 2: PROMPT GENERATION (OPTIONAL — uses defaults if fails)
        // ═══════════════════════════════════════════════════════════════
        const stage2Start = Date.now()
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('  STAGE 2: PROMPT GENERATION')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        let finalPrompt: string

        // Build scene authority text block to append to prompts
        const sceneAuthorityText = buildSceneAuthorityTextBlock(sceneAuthority)

        try {
            const promptData = await generateStrictTryOnPrompt({
                personImageBase64: input.personImageBase64,
                garmentImageBase64: input.garmentImageBase64,
                sceneDescription: input.sceneDescription
            })
            logPromptGeneratorStatus(sessionId, promptData)
            finalPrompt = buildFinalGenerationPrompt(promptData, input.userRequest)

            // INJECT SCENE AUTHORITY RULES INTO PROMPT
            finalPrompt = finalPrompt + '\n\n' + sceneAuthorityText

            stages.push({
                stage: 2,
                name: 'Prompt Generation',
                status: 'PASS',
                timeMs: Date.now() - stage2Start,
                data: { promptLength: finalPrompt.length, sceneInjected: true }
            })
        } catch (promptError) {
            console.warn('⚠️ Prompt generation failed, using default prompt')
            // Simple default prompt WITH SCENE AUTHORITY
            finalPrompt = `Apply the clothing from Image 2 onto the person in Image 1.
Keep the same pose, body shape, and camera angle.
This is a simple clothing swap only.

${sceneAuthorityText}`

            stages.push({
                stage: 2,
                name: 'Prompt Generation',
                status: 'SKIP',
                timeMs: Date.now() - stage2Start,
                data: { error: 'Using default prompt', sceneInjected: true }
            })
        }

        // ═══════════════════════════════════════════════════════════════
        // STAGE 3: IMAGE GENERATION (GEMINI — UNTRUSTED FOR FACE)
        // ═══════════════════════════════════════════════════════════════
        const stage3Start = Date.now()
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('  STAGE 3: IMAGE GENERATION (Gemini)')
        console.log('  ⚠️ GEMINI OUTPUT IS UNTRUSTED — Face will be OVERWRITTEN in Stage 4')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        generatedImage = await generateWithNanoBanana({
            personImageBase64: input.personImageBase64,
            garmentImageBase64: input.garmentImageBase64,
            prompt: finalPrompt,
            qualityTier: 'low',    // Always low temp for minimal hallucination
            isRetry: false
        })
        logNanoBananaStatus(sessionId, generatedImage)

        stages.push({
            stage: 3,
            name: 'Image Generation (Gemini)',
            status: 'PASS',
            timeMs: Date.now() - stage3Start,
            data: {
                generationTimeMs: generatedImage.generationTimeMs,
                qualityTier: generatedImage.qualityTier,
                promptCleaned: generatedImage.promptCleaned,
                warning: 'Face in this image is UNTRUSTED'
            }
        })

        // ═══════════════════════════════════════════════════════════════
        // STAGE 4: FACE PIXEL OVERWRITE — MANDATORY (NO FALLBACK)
        // This is where face drift is IMPOSSIBLE by construction.
        // ═══════════════════════════════════════════════════════════════
        const stage4Start = Date.now()
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('  STAGE 4: FACE PIXEL OVERWRITE (Sharp Composite)')
        console.log('  🔴 MANDATORY: Original face pixels will replace Gemini\'s face')
        console.log('  🔴 NO FALLBACK: If this fails, entire generation fails')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        const generatedImageBuffer = base64ToBuffer(generatedImage.image)

        compositeResult = await compositeFacePixels(generatedImageBuffer, facePixelData)

        if (!compositeResult.success || !compositeResult.faceSourcedFromOriginal) {
            console.error('❌ CRITICAL FAILURE: Face pixel composite failed')
            console.error('   CANNOT return raw Gemini output — would cause face drift')
            console.error('   Error:', compositeResult.error)

            stages.push({
                stage: 4,
                name: 'Face Pixel Overwrite',
                status: 'FAIL',
                timeMs: Date.now() - stage4Start,
                data: { error: compositeResult.error }
            })

            return {
                success: false,
                image: '',  // DO NOT return generatedImage.image — that would expose drifted face
                status: 'FAIL',
                warnings: ['Face composite failed. Please try again.'],
                debug: { stages, totalTimeMs: Date.now() - startTime, faceOverwritten: false }
            }
        }

        // Convert composited buffer back to base64
        finalImage = bufferToBase64(compositeResult.outputBuffer)

        console.log('   ✅ FACE PIXEL OVERWRITE COMPLETE')
        console.log('   🔒 Face pixels are IDENTICAL to original input')
        console.log('   🔒 Face drift is IMPOSSIBLE by construction')

        stages.push({
            stage: 4,
            name: 'Face Pixel Overwrite',
            status: 'PASS',
            timeMs: Date.now() - stage4Start,
            data: {
                faceOverwritten: true,
                faceSourcedFromOriginal: true,
                faceBox: facePixelData.box
            }
        })

        // ═══════════════════════════════════════════════════════════════
        // STAGE 5: PHASE-2 ENVIRONMENT REFINEMENT (OPTIONAL)
        // Only runs if enabled and main generation succeeded
        // ═══════════════════════════════════════════════════════════════
        if (input.enableRefinement) {
            try {
                const stage5Start = Date.now()
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
                console.log('  STAGE 5: PHASE-2 ENVIRONMENT REFINEMENT')
                console.log('  🔒 Human region is READ-ONLY — only lighting/background will change')
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

                const refinedResult = await refineEnvironmentAndLighting({
                    phase1ImageBase64: finalImage,
                    originalPersonBase64: input.personImageBase64,
                    temperature: 0.02
                })
                logRefinementStatus(sessionId, refinedResult)

                // IMPORTANT: Re-apply face overwrite after refinement
                // Refinement might have altered face region
                const refinedBuffer = base64ToBuffer(refinedResult.image)
                const reoverwriteResult = await compositeFacePixels(refinedBuffer, facePixelData)

                if (reoverwriteResult.success) {
                    finalImage = bufferToBase64(reoverwriteResult.outputBuffer)
                    console.log('   ✅ Face pixels re-applied after refinement')
                } else {
                    // Keep pre-refinement image (already has face overwritten)
                    console.warn('   ⚠️ Face re-overwrite failed, using pre-refinement image')
                }

                stages.push({
                    stage: 5,
                    name: 'Phase-2 Refinement',
                    status: 'PASS',
                    timeMs: Date.now() - stage5Start,
                    data: { refinementTimeMs: refinedResult.refinementTimeMs }
                })
            } catch (refinementError) {
                console.warn('⚠️ Phase-2 refinement failed, using Phase-1 output:', refinementError)
                warnings.push('Environment refinement skipped')
                stages.push({
                    stage: 5,
                    name: 'Phase-2 Refinement',
                    status: 'SKIP',
                    timeMs: 0,
                    data: { error: refinementError instanceof Error ? refinementError.message : 'Unknown' }
                })
            }
        }

    } catch (error) {
        console.error('❌ Pipeline error:', error)
        warnings.push(error instanceof Error ? error.message : 'Unknown pipeline error')

        return {
            success: false,
            image: '',  // NEVER return raw Gemini output
            status: 'FAIL',
            warnings,
            debug: { stages, totalTimeMs: Date.now() - startTime, faceOverwritten: false }
        }
    }

    const totalTimeMs = Date.now() - startTime

    console.log('\n')
    console.log('╔═══════════════════════════════════════════════════════════════════════════════╗')
    console.log('║                                                                               ║')
    console.log('║   ✅ PIPELINE COMPLETE — ZERO FACE DRIFT GUARANTEED                          ║')
    console.log(`║   Total time: ${(totalTimeMs / 1000).toFixed(1)}s`.padEnd(80) + '║')
    console.log('║   Face overwritten: YES (original pixels composited)                         ║')
    console.log('║   Face drift: IMPOSSIBLE (by construction, not validation)                   ║')
    console.log('║                                                                               ║')
    console.log('╚═══════════════════════════════════════════════════════════════════════════════╝')
    console.log('\n')

    return {
        success: true,
        image: finalImage,
        status: 'PASS',
        warnings,
        debug: {
            stages,
            totalTimeMs,
            faceOverwritten: true
        }
    }
}

/**
 * Export types for use in API routes
 */
export type {
    QualityCheckResult,
    GeneratedPrompt,
    NanoBananaResult,
    QualityTier,
    RefinementResult,
    FacePixelData,
    PixelCopyResult,
    FaceBox
}
