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

    // Fetch full campaign list for analysis (same shape as GET /api/campaigns, no embed)
    const { data: campaignsList } = await service
      .from('campaigns')
      .select('*')
      .eq('brand_id', user.id)
      .order('created_at', { ascending: false })

    const list = campaignsList || []
    const campaignIds = list.map((c: { id: string }) => c.id)
    let audienceByCampaign: Record<string, Record<string, unknown>> = {}
    let creativesByCampaign: Record<string, Record<string, unknown>> = {}

    if (campaignIds.length > 0) {
      const [audienceRes, creativesRes] = await Promise.all([
        service.from('campaign_audience').select('*').in('campaign_id', campaignIds),
        service.from('campaign_creatives').select('*').in('campaign_id', campaignIds),
      ])
      if (!audienceRes.error && audienceRes.data) {
        for (const row of audienceRes.data as { campaign_id: string }[]) {
          audienceByCampaign[row.campaign_id] = row as Record<string, unknown>
        }
      }
      if (!creativesRes.error && creativesRes.data) {
        for (const row of creativesRes.data as { campaign_id: string }[]) {
          creativesByCampaign[row.campaign_id] = row as Record<string, unknown>
        }
      }
    }

    const campaignSummaries = list.map((c: Record<string, unknown>) => {
      const id = c.id as string
      const audience = audienceByCampaign[id]
      const creative = creativesByCampaign[id]
      const ageRange =
        audience && (audience.age_min != null || audience.age_max != null)
          ? `Age ${audience.age_min ?? '?'}-${audience.age_max ?? '?'}`
          : ''
      const location = audience?.location ? `, Location: ${audience.location}` : ''
      const interests =
        audience?.interests && Array.isArray(audience.interests)
          ? `, Interests: ${(audience.interests as string[]).join(', ')}`
          : ''
      const headline = creative?.headline ? ` | Headline: "${creative.headline}"` : ''
      const cta = creative?.cta_text ? ` | CTA: ${creative.cta_text}` : ''
      return `- "${c.title}" (ID: ${id})
  Status: ${c.status} | Goal: ${c.goal ?? '—'} | Budget type: ${c.budget_type ?? '—'}
  Budget: daily=${c.daily_budget ?? '—'} total=${c.total_budget ?? '—'} | Start: ${c.start_date ?? '—'} End: ${c.end_date ?? '—'}
  Audience: ${ageRange}${location}${interests || ' —'}
  Creative: ${headline || ' —'}${cta}
  Metrics: spend=₹${Number(c.spend) || 0} | impressions=${Number(c.impressions) || 0} | clicks=${Number(c.clicks) || 0} | conversions=${Number(c.conversions) || 0}`
    })

    const campaignsContext =
      campaignSummaries.length > 0
        ? `\n\nCurrent campaigns (use this data to analyze, compare, and answer questions about the brand's campaigns):\n${campaignSummaries.join('\n\n')}`
        : '\n\nThe brand has no campaigns yet. Encourage creating a first campaign and offer to help with goals, audience, creative, and budget.'

    // Get available influencers count
    const { count: influencerCount } = await service
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'influencer')
      .eq('approval_status', 'approved')

    // Build system prompt
    const systemPrompt = `You are an intelligent campaign assistant for brands on Kiwikoo, an AI fashion try-on marketplace. Your role is to help brands create effective marketing campaigns, suggest influencers, plan budgets, and provide strategic advice. You have access to the brand's actual campaign data so you can analyze performance, compare campaigns, and answer specific questions about past or current campaigns.

Brand Context:
- Company: ${brandContext.companyName}
- Brand Type: ${brandContext.brandType}
- Target Audience: ${brandContext.targetAudience}
- Industry: ${brandContext.vertical}
- Total campaigns: ${list.length}

Available Influencers: ${influencerCount || 0} influencers available on the platform
${campaignsContext}

Your capabilities:
1. Analyze and summarize the brand's existing campaigns (performance, spend, goals, audience).
2. Compare campaigns (e.g. which has best conversions, highest spend, or best CTR).
3. Generate new campaign ideas and briefs based on what has worked.
4. Suggest content strategies and recommend influencer types.
5. Help with budget planning and ROI estimates (use INR).
6. Answer any question about the brand's campaigns using the data above.

Be concise, actionable, and specific. When the user asks about "my campaigns", "old campaigns", "new campaigns", or a specific campaign by name or goal, use the campaign data provided. When discussing budgets, use INR.`

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
