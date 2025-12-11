/**
 * Image Analysis API Endpoint
 * Analyzes uploaded images and returns intelligent recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeImageIntelligence } from '@/lib/analysis/image-intelligence'
import { analyzePresetCompatibility, getPresetSuggestions } from '@/lib/analysis/preset-recommender'

export async function POST(request: NextRequest) {
    try {
        const { imageBase64 } = await request.json()

        if (!imageBase64) {
            return NextResponse.json(
                { error: 'Image is required' },
                { status: 400 }
            )
        }

        console.log('🔍 Starting image intelligence analysis...')

        // Analyze the image
        const intelligence = await analyzeImageIntelligence(imageBase64)

        // Get preset recommendations
        const presetAnalysis = analyzePresetCompatibility(intelligence)
        const suggestions = getPresetSuggestions(intelligence)

        console.log('✅ Image analysis complete')
        console.log(`   Camera: ${intelligence.camera.angle} angle, ${intelligence.camera.shotType} shot`)
        console.log(`   Pose: ${intelligence.pose.position}, complexity ${intelligence.pose.complexity}/10`)
        console.log(`   Warnings: ${presetAnalysis.warnings.length}`)

        return NextResponse.json({
            success: true,
            analysis: {
                camera: intelligence.camera,
                pose: intelligence.pose,
                compatibility: intelligence.compatibility,
            },
            warnings: presetAnalysis.warnings,
            recommendations: presetAnalysis.recommendations.slice(0, 5), // Top 5
            suggestedAction: presetAnalysis.suggestedAction,
            bestPresetId: presetAnalysis.bestPresetId,
            presetGroups: suggestions,
        })
    } catch (error) {
        console.error('Image analysis API error:', error)
        return NextResponse.json(
            { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        )
    }
}
