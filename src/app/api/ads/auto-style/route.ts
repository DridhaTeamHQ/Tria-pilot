/**
 * POST /api/ads/auto-style
 *
 * Analyzes a product's metadata (and optionally an image via GPT-4o Vision)
 * and returns ranked ad style recommendations with preset, environment,
 * lighting mood, and character suggestions — no manual preset hunting needed.
 *
 * Body:
 *   {
 *     productId?: string,          // look up from brand's catalog
 *     // OR supply inline signals:
 *     name?: string,
 *     description?: string,
 *     category?: string,
 *     tags?: string[],
 *     price?: number,
 *     imageUrl?: string,           // optional — triggers GPT-4o Vision analysis
 *   }
 *
 * Returns:
 *   SceneIntelligenceResult & { productName: string }
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import { analyseProductForScene, type ProductSignals } from '@/lib/ads/scene-intelligence'
import { getOpenAIKey } from '@/lib/config/api-keys'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const bodySchema = z.union([
  z.object({
    productId: z.string().uuid(),
    imageUrl: z.string().url().optional(),
  }),
  z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    category: z.string().max(100).optional(),
    tags: z.array(z.string()).max(20).optional(),
    price: z.number().nonnegative().optional(),
    imageUrl: z.string().url().optional(),
  }),
])

async function enrichSignalsWithVision(
  signals: ProductSignals,
  imageUrl: string,
): Promise<ProductSignals> {
  let apiKey: string
  try {
    apiKey = getOpenAIKey()
  } catch {
    return signals
  }

  const openai = new OpenAI({ apiKey })
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a product analyst for a fashion/lifestyle platform. Look at this product image and return JSON with these fields:
{
  "verticalHint": one of: "fashion"|"beauty"|"lifestyle"|"sports"|"jewelry"|"tech"|"food"|"indian_fashion"|"general",
  "additionalTags": array of 3-5 descriptive keywords (e.g. "streetwear", "luxury", "minimalist", "ethnic", "sporty"),
  "priceTierHint": one of: "budget"|"mid"|"premium"|"luxury"
}
Be concise and accurate. Return ONLY the JSON object.`,
            },
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'low' },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
    })

    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return {
      ...signals,
      verticalHint: parsed.verticalHint || signals.verticalHint,
      tags: [...(signals.tags || []), ...(parsed.additionalTags || [])],
    }
  } catch {
    return signals
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const service = createServiceClient()
    let signals: ProductSignals
    let productName = ''

    if ('productId' in parsed.data) {
      // Fetch from DB and verify ownership
      const { data: product, error } = await service
        .from('products')
        .select('id, name, description, category, tags, price, brand_id')
        .eq('id', parsed.data.productId)
        .single()

      if (error || !product) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 })
      }

      // Ownership check
      const { data: brandIdRow } = await service
        .from('brand_profiles')
        .select('id')
        .eq('user_id', authUser.id)
        .single()

      if (!brandIdRow || product.brand_id !== brandIdRow.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      productName = product.name
      signals = {
        name: product.name,
        description: product.description,
        category: product.category,
        tags: Array.isArray(product.tags) ? product.tags : [],
        price: product.price ? Number(product.price) : null,
      }
    } else {
      productName = parsed.data.name
      signals = {
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        tags: parsed.data.tags,
        price: parsed.data.price,
      }
    }

    const imageUrl = parsed.data.imageUrl
    if (imageUrl) {
      signals = await enrichSignalsWithVision(signals, imageUrl)
    }

    const result = analyseProductForScene(signals)

    return NextResponse.json({ productName, ...result })
  } catch (error) {
    console.error('[auto-style] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
