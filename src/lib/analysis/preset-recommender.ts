/**
 * Preset Recommender Module
 * Matches image analysis with preset requirements to provide recommendations
 */

import { ImageIntelligence } from './image-intelligence'
import { getAllPresets, TryOnPreset } from '../prompts/try-on-presets'

export interface PresetRecommendation {
    presetId: string
    presetName: string
    category: string
    compatibility: 'excellent' | 'good' | 'moderate' | 'poor'
    score: number // 0-100
    reason: string
    adaptations: string[] // What the AI will do to make it work
}

export interface PresetAnalysisResult {
    recommendations: PresetRecommendation[]
    warnings: string[]
    suggestedAction: string | null
    bestPresetId: string | null
}

/**
 * Analyze preset compatibility based on image intelligence
 */
export function analyzePresetCompatibility(
    intelligence: ImageIntelligence
): PresetAnalysisResult {
    const allPresets = getAllPresets()
    const recommendations: PresetRecommendation[] = []
    const warnings: string[] = []

    for (const preset of allPresets) {
        const rec = evaluatePreset(preset, intelligence)
        recommendations.push(rec)
    }

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score)

    // Generate warnings based on pose
    if (intelligence.pose.position === 'lying') {
        warnings.push('Lying poses are difficult to adapt for outdoor/standing scenes')
        warnings.push('Consider using close-up or portrait-style presets for best results')
    }

    if (intelligence.pose.complexity >= 7) {
        warnings.push('Complex pose detected - face consistency may vary')
        warnings.push('Simpler poses work better for background changes')
    }

    if (intelligence.pose.faceAngle === 'profile') {
        warnings.push('Profile view may affect face identity preservation')
    }

    // Suggested action based on analysis
    let suggestedAction: string | null = null
    if (!intelligence.pose.adaptable && intelligence.compatibility.outdoorStanding === false) {
        suggestedAction = 'For outdoor presets, try uploading a standing or sitting photo'
    } else if (intelligence.pose.complexity >= 8) {
        suggestedAction = 'For best results, try a simpler pose (standing or seated)'
    }

    return {
        recommendations,
        warnings: [...warnings, ...intelligence.warnings],
        suggestedAction,
        bestPresetId: recommendations.length > 0 && recommendations[0].score >= 70
            ? recommendations[0].presetId
            : null,
    }
}

/**
 * Evaluate a single preset against image intelligence
 */
function evaluatePreset(
    preset: TryOnPreset,
    intelligence: ImageIntelligence
): PresetRecommendation {
    let score = 100
    const reasons: string[] = []
    const adaptations: string[] = []

    // Check category compatibility
    const category = preset.category

    // Pose position compatibility
    if (intelligence.pose.position === 'lying') {
        if (category === 'indian' || category === 'travel') {
            score -= 40
            reasons.push('Lying pose difficult for outdoor monuments')
            adaptations.push('Will attempt close-up framing')
        }
        if (preset.background?.includes('standing') || preset.background?.includes('temple')) {
            score -= 30
            reasons.push('Scene expects standing/natural pose')
        }
    }

    // Pose complexity penalty
    if (intelligence.pose.complexity >= 7) {
        score -= (intelligence.pose.complexity - 6) * 5
        reasons.push(`Complex pose (${intelligence.pose.complexity}/10)`)
        adaptations.push('Will simplify pose for scene adaptation')
    }

    // Camera angle compatibility
    if (intelligence.camera.angle === 'above' && category === 'indian') {
        score -= 15
        reasons.push('Above angle unusual for monument shots')
        adaptations.push('Will attempt to match camera perspective')
    }

    // Shot type compatibility
    if (intelligence.camera.shotType === 'close-up') {
        // Close-ups work better for complex poses
        if (intelligence.pose.complexity >= 6) {
            score += 15
            reasons.push('Close-up framing helps with complex poses')
        }
    }

    // Face angle impact
    if (intelligence.pose.faceAngle === 'profile') {
        score -= 20
        reasons.push('Profile view affects face consistency')
        adaptations.push('Will preserve face angle in output')
    } else if (intelligence.pose.faceAngle === 'three-quarter') {
        score -= 5 // Slight penalty but generally works
    }

    // Boost for compatible categories
    if (intelligence.bestPresetCategories.includes(category)) {
        score += 10
        reasons.push('Matches recommended category')
    }

    // Specific compatibility flags
    if (category === 'indian' && !intelligence.compatibility.templeMonument) {
        score -= 25
        reasons.push('Current pose not ideal for monument backgrounds')
    }

    if (category === 'street' && !intelligence.compatibility.casualStreet) {
        score -= 20
        reasons.push('Current pose not ideal for street scenes')
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score))

    // Determine compatibility level
    let compatibility: 'excellent' | 'good' | 'moderate' | 'poor'
    if (score >= 80) {
        compatibility = 'excellent'
    } else if (score >= 60) {
        compatibility = 'good'
    } else if (score >= 40) {
        compatibility = 'moderate'
    } else {
        compatibility = 'poor'
    }

    return {
        presetId: preset.id,
        presetName: preset.name,
        category: preset.category,
        compatibility,
        score,
        reason: reasons.length > 0 ? reasons.join('; ') : 'Good compatibility',
        adaptations,
    }
}

/**
 * Get UI-friendly preset suggestions
 */
export function getPresetSuggestions(
    intelligence: ImageIntelligence
): {
    excellent: string[]
    good: string[]
    warning: string[]
} {
    const result = analyzePresetCompatibility(intelligence)

    return {
        excellent: result.recommendations
            .filter(r => r.compatibility === 'excellent')
            .map(r => r.presetId),
        good: result.recommendations
            .filter(r => r.compatibility === 'good')
            .map(r => r.presetId),
        warning: result.recommendations
            .filter(r => r.compatibility === 'moderate' || r.compatibility === 'poor')
            .map(r => r.presetId),
    }
}
