/**
 * CAMPAIGNS CHAT API
 * 
 * AI assistant for campaign strategy
 * Uses Supabase only - NO Prisma
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { getOpenAI } from '@/lib/openai'
import { z } from 'zod'

const openai = getOpenAI()

const chatSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
    conversationHistory: z
      .array(
        z
          .object({
            role: z.enum(['system', 'user', 'assistant']),
            content: z.string().max(8000),
          })
          .strict()
      )
      .max(50)
      .optional(),
  })
  .strict()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // Get brand profile
    const { data: profile } = await service
      .from('profiles')
      .select('role, brand_data')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'brand') {
      return NextResponse.json({ error: 'Unauthorized - Brand access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    const message = parsed.data.message
    const conversationHistory = parsed.data.conversationHistory ?? []

    // Get brand context from brand_data
    const brandData = profile.brand_data as any || {}
    const brandContext = {
      companyName: brandData.companyName || 'Brand',
      brandType: brandData.brandType || 'Not specified',
      targetAudience: brandData.targetAudience || 'Not specified',
      vertical: brandData.vertical || 'Not specified',
    }

    // Get recent campaigns count
    const { count: campaignCount } = await service
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('brand_id', user.id)

    // Get available influencers count
    const { count: influencerCount } = await service
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'influencer')
      .eq('approval_status', 'approved')

    // Build system prompt
    const systemPrompt = `You are an intelligent campaign assistant for brands on Kiwikoo, an AI fashion try-on marketplace. Your role is to help brands create effective marketing campaigns, suggest influencers, plan budgets, and provide strategic advice.

Brand Context:
- Company: ${brandContext.companyName}
- Brand Type: ${brandContext.brandType}
- Target Audience: ${brandContext.targetAudience}
- Industry: ${brandContext.vertical}
- Previous Campaigns: ${campaignCount || 0}

Available Influencers: ${influencerCount || 0} influencers available on the platform

Your capabilities:
1. Generate campaign ideas and briefs
2. Suggest content strategies
3. Recommend influencer types based on brand needs
4. Help with budget planning and ROI estimates
5. Provide timeline and scheduling suggestions
6. Answer questions about campaign strategy

Be concise, actionable, and specific. When suggesting influencers, mention criteria like niche, audience, follower count, or engagement rate. When discussing budgets, provide realistic estimates in INR.`

    // Build conversation messages
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message },
    ]

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    })

    const response = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response.'

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Campaign chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
