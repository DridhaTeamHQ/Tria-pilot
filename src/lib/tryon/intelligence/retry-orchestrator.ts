/**
 * RETRY ORCHESTRATOR - Intelligent Retry System
 * 
 * Manages retries with progressively stronger constraints.
 * Tracks which aspects failed and adjusts accordingly.
 */

import 'server-only'
import { GarmentClassification } from './garment-classifier'
import { UserAnalysis } from './user-analyzer'
import { FaceValidationResult } from './face-guardrail'
import { GarmentValidationResult } from './garment-guardrail'

export interface RetryContext {
    attempt: number
    maxAttempts: number
    previousFailures: FailureType[]
    constraintMultipliers: {
        face: number
        body: number
        garment: number
        pose: number
    }
}

export type FailureType =
    | 'FACE_MISMATCH'
    | 'BODY_MISMATCH'
    | 'GARMENT_TYPE_WRONG'
    | 'GARMENT_LENGTH_WRONG'
    | 'PATTERN_WRONG'
    | 'COLOR_WRONG'
    | 'POSE_WRONG'
    | 'ACCESSORIES_MISSING'
    | 'VALIDATION_ERROR'

export interface OrchestratorResult {
    success: boolean
    finalImage: string | null
    attempts: number
    validationResults: {
        face: FaceValidationResult | null
        garment: GarmentValidationResult | null
    }[]
    failures: FailureType[]
    finalMessage: string
}

export function initRetryContext(maxAttempts: number = 3): RetryContext {
    return {
        attempt: 0,
        maxAttempts,
        previousFailures: [],
        constraintMultipliers: {
            face: 1.0,
            body: 1.0,
            garment: 1.0,
            pose: 1.0
        }
    }
}

export function updateContextAfterFailure(
    context: RetryContext,
    failures: FailureType[]
): RetryContext {
    const newContext = { ...context }
    newContext.attempt++
    newContext.previousFailures.push(...failures)

    // Increase constraint weight for failed aspects
    for (const failure of failures) {
        switch (failure) {
            case 'FACE_MISMATCH':
                newContext.constraintMultipliers.face *= 1.5
                break
            case 'BODY_MISMATCH':
                newContext.constraintMultipliers.body *= 1.5
                break
            case 'GARMENT_TYPE_WRONG':
            case 'GARMENT_LENGTH_WRONG':
            case 'PATTERN_WRONG':
            case 'COLOR_WRONG':
                newContext.constraintMultipliers.garment *= 1.5
                break
            case 'POSE_WRONG':
                newContext.constraintMultipliers.pose *= 1.5
                break
        }
    }

    console.log(`\n🔄 RETRY: Attempt ${newContext.attempt + 1}/${newContext.maxAttempts}`)
    console.log(`   Constraint multipliers: face=${newContext.constraintMultipliers.face.toFixed(1)}, garment=${newContext.constraintMultipliers.garment.toFixed(1)}`)

    return newContext
}

export function generateRetryEmphasis(context: RetryContext): string {
    if (context.attempt === 0) {
        return '' // No emphasis on first attempt
    }

    const emphasisBlocks: string[] = []

    if (context.constraintMultipliers.face > 1.0) {
        emphasisBlocks.push(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ⚠️  FACE FAILED IN PREVIOUS ATTEMPT - EXTRA EMPHASIS                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ The face in the previous output did NOT match the original.                   ║
║ THIS TIME: Copy the face EXACTLY. Same person. Same features.                 ║
║ REJECTION REASON: Face mismatch detected by validation system.                ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`)
    }

    if (context.constraintMultipliers.garment > 1.0) {
        emphasisBlocks.push(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ⚠️  GARMENT FAILED IN PREVIOUS ATTEMPT - EXTRA EMPHASIS                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ The garment type or length was WRONG in the previous output.                  ║
║ THIS TIME: Match the garment EXACTLY as shown in Image 2.                     ║
║ Check the hemline position carefully.                                          ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`)
    }

    if (context.constraintMultipliers.body > 1.0) {
        emphasisBlocks.push(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ⚠️  BODY FAILED IN PREVIOUS ATTEMPT - EXTRA EMPHASIS                          ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ The body proportions were WRONG in the previous output.                       ║
║ THIS TIME: Use ONLY body proportions from Image 1.                            ║
║ Do NOT use the model's body from Image 2.                                     ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`)
    }

    return emphasisBlocks.join('\n')
}

export function detectFailures(
    faceResult: FaceValidationResult | null,
    garmentResult: GarmentValidationResult | null
): FailureType[] {
    const failures: FailureType[] = []

    if (faceResult) {
        if (!faceResult.analysis.same_person) {
            failures.push('FACE_MISMATCH')
        }
    }

    if (garmentResult) {
        if (!garmentResult.type_match) {
            failures.push('GARMENT_TYPE_WRONG')
        }
        if (!garmentResult.length_match) {
            failures.push('GARMENT_LENGTH_WRONG')
        }
        if (!garmentResult.pattern_match) {
            failures.push('PATTERN_WRONG')
        }
        if (!garmentResult.color_match) {
            failures.push('COLOR_WRONG')
        }
    }

    return failures
}

export function shouldRetry(
    context: RetryContext,
    faceResult: FaceValidationResult | null,
    garmentResult: GarmentValidationResult | null
): boolean {
    // Check if we've exhausted retries
    if (context.attempt >= context.maxAttempts) {
        console.log('   ❌ Max retries reached, accepting best result')
        return false
    }

    // Check face
    if (faceResult && !faceResult.is_valid) {
        console.log('   🔄 Face validation failed, will retry')
        return true
    }

    // Check garment
    if (garmentResult && !garmentResult.is_valid) {
        console.log('   🔄 Garment validation failed, will retry')
        return true
    }

    console.log('   ✅ All validations passed')
    return false
}

export function logOrchestratorStatus(context: RetryContext): void {
    console.log(`\n📊 ORCHESTRATOR STATUS:`)
    console.log(`   Attempt: ${context.attempt + 1}/${context.maxAttempts}`)
    console.log(`   Previous failures: ${context.previousFailures.join(', ') || 'none'}`)
    console.log(`   Face emphasis: ${context.constraintMultipliers.face.toFixed(1)}x`)
    console.log(`   Garment emphasis: ${context.constraintMultipliers.garment.toFixed(1)}x`)
    console.log(`   Body emphasis: ${context.constraintMultipliers.body.toFixed(1)}x`)
}
