import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { generateAdPrompt, validateAdInput, type AdGenerationInput } from '@/lib/ads/ad-styles'
import { rateAdCreative, generateAdCopy } from '@/lib/openai'
import { generateIntelligentAdComposition } from '@/lib/gemini'
import { saveUpload } from '@/lib/storage'
import prisma from '@/lib/prisma'
import { z } from 'zod'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const supabase = await createClient()
        const {
            data: { user: authUser },
        } = await supabase.auth.getUser()

        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: authUser.email! },
        })

        if (!dbUser || dbUser.role !== 'BRAND') {
            return NextResponse.json({ error: 'Unauthorized - Brand access required' }, { status: 403 })
        }

        // Find the existing creative
        const existingCreative = await prisma.adCreative.findUnique({
            where: { id },
        })

        if (!existingCreative) {
            return NextResponse.json({ error: 'Creative not found' }, { status: 404 })
        }

        if (existingCreative.brandId !== dbUser.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        const meta = (existingCreative.meta as any) || {}

        // Check regeneration limit
        const regenCount = meta.regenerationCount || 0
        const maxRegens = meta.maxRegenerations || 5

        if (regenCount >= maxRegens) {
            return NextResponse.json(
                { error: 'Regeneration limit reached for this creative' },
                { status: 429 }
            )
        }

        // Check cooldown (3 minutes = 180000ms)
        const lastRegen = meta.lastRegenerationAt ? new Date(meta.lastRegenerationAt).getTime() : 0
        const cooldownMs = 180000
        const timeSinceLastRegen = Date.now() - lastRegen

        if (timeSinceLastRegen < cooldownMs) {
            const waitSeconds = Math.ceil((cooldownMs - timeSinceLastRegen) / 1000)
            return NextResponse.json(
                { error: `Please wait ${waitSeconds} seconds before regenerating` },
                { status: 429 }
            )
        }

        // Check rate limit
        const rateLimit = checkRateLimit(dbUser.id, 'ads')
        if (!rateLimit.allowed) {
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    resetTime: rateLimit.resetTime,
                },
                { status: 429 }
            )
        }

        // Get optional prompt modifier from request body
        const body = await request.json().catch(() => null)
        const promptModifier = z
          .object({
            promptModifier: z.string().trim().max(500).optional(),
          })
          .strict()
          .parse(body || {})
          .promptModifier || ''

        // Reconstruct generation input from metadata
        const originalInput: AdGenerationInput = {
            preset: meta.stylePreset || 'UGC_CANDID',
            campaignId: meta.campaignId,
            productImage: meta.productImage,
            influencerImage: meta.influencerImage,
            lockFaceIdentity: meta.lockFaceIdentity,
            headline: meta.headline,
            ctaType: meta.ctaType || 'shop_now',
            captionTone: meta.captionTone,
            platforms: meta.platforms || ['instagram'],
        }

        // Generate new prompt (with optional modifier)
        let prompt = generateAdPrompt(originalInput)
        if (promptModifier) {
            prompt = `${promptModifier}\n\n${prompt}`
        }

        // Generate new image
        const generatedImage = await generateIntelligentAdComposition(
            originalInput.productImage,
            originalInput.influencerImage,
            prompt
        )

        // Rate the new ad
        const rating = await rateAdCreative(
            generatedImage,
            originalInput.productImage,
            originalInput.influencerImage
        )

        // Generate new copy variants
        const copyVariants = await generateAdCopy(generatedImage, {
            productName: meta.productAnalysis?.garmentType,
            brandName: dbUser.name || undefined,
            niche: meta.stylePreset,
        })

        // Save new image
        const imagePath = `${dbUser.id}/${Date.now()}.jpg`
        const imageUrl = await saveUpload(generatedImage, imagePath, 'ads')

        // Update creative
        const updatedCreative = await prisma.adCreative.update({
            where: { id },
            data: {
                imagePath: imageUrl,
                copy: copyVariants[0] || '',
                meta: {
                    ...meta,
                    rating: rating as any,
                    copyVariants: copyVariants as any,
                    regenerationCount: regenCount + 1,
                    lastRegenerationAt: new Date().toISOString(),
                    qualityScore: (rating as any)?.score || 75,
                },
            },
        })

        return NextResponse.json({
            id: updatedCreative.id,
            imageUrl,
            copy: copyVariants,
            rating,
            regenerationCount: regenCount + 1,
            maxRegenerations: maxRegens,
        })
    } catch (error) {
        console.error('Ad regeneration error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
