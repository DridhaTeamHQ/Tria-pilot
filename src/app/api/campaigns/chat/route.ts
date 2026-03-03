/**
 * CAMPAIGNS CHAT API — AI Campaign Strategist
 *
 * Complete rewrite: transforms the basic chatbot into a phased strategist
 * with 4-role activation (Researcher → Ideator → Scripter → Analyst)
 * and auto-campaign creation.
 *
 * Uses Supabase only — NO Prisma
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import { getOpenAI } from '@/lib/openai'
import { z } from 'zod'
import { buildStrategistSystemPrompt } from '@/lib/campaigns/campaign-strategist-prompt'
import type {
  StrategistPhase,
  BrandContext,
  CampaignStrategyOutput,
} from '@/lib/campaigns/campaign-strategist-types'
import type { CampaignGoal, BudgetType } from '@/lib/campaigns/types'

const chatSchema = z
  .object({
    message: z.string().trim().min(1).max(4000),
    phase: z.enum(['intake', 'researcher', 'ideator', 'scripter', 'analyst', 'complete']).default('intake'),
    conversationHistory: z
      .array(
        z.object({
          role: z.enum(['system', 'user', 'assistant']),
          content: z.string().max(12000),
        })
      )
      .max(80)
      .optional(),
  })
  .strict()

/**
 * Parse a campaign_create JSON block from the AI's response.
 * Returns the parsed payload or null if not found.
 */
function parseCampaignPayload(content: string): CampaignStrategyOutput | null {
  const match = content.match(/```campaign_create\s*([\s\S]*?)```/)
  if (!match?.[1]) return null

  try {
    const parsed = JSON.parse(match[1].trim())
    // Validate required fields
    if (!parsed.title || !parsed.goal || !parsed.brief) return null
    return parsed as CampaignStrategyOutput
  } catch {
    return null
  }
}

/**
 * Detect phase transition markers in the AI's response.
 * Primary: looks for explicit [PHASE:xxx] markers.
 * Fallback: infers phase from content keywords when marker is missing.
 */
function detectPhaseTransition(content: string, currentPhase: StrategistPhase): StrategistPhase | null {
  // Primary: explicit marker
  const match = content.match(/\[PHASE:(\w+)\]/)
  if (match?.[1]) {
    const validPhases: StrategistPhase[] = ['intake', 'researcher', 'ideator', 'scripter', 'analyst', 'complete']
    const phase = match[1] as StrategistPhase
    if (validPhases.includes(phase)) return phase
  }

  // Fallback: content-based detection when AI forgets the marker
  const lower = content.toLowerCase()

  if (currentPhase === 'intake') {
    // If the AI produced a research-like output while still in intake, transition
    const researchSignals = ['competitor', 'audience psychology', 'insight brief', 'objection', 'content gap', 'market intelligence']
    const signalCount = researchSignals.filter(s => lower.includes(s)).length
    if (signalCount >= 3) return 'researcher'
  }

  if (currentPhase === 'researcher') {
    const ideatorSignals = ['hook bank', 'content angles', 'campaign theme', 'big idea', 'content system', 'posting cadence']
    const signalCount = ideatorSignals.filter(s => lower.includes(s)).length
    if (signalCount >= 2) return 'ideator'
  }

  if (currentPhase === 'ideator') {
    const scripterSignals = ['[hook]', '[body]', '[cta]', 'ad script', 'ugc brief', 'influencer script', 'organic content script']
    const signalCount = scripterSignals.filter(s => lower.includes(s)).length
    if (signalCount >= 2) return 'scripter'
  }

  if (currentPhase === 'scripter') {
    const analystSignals = ['a/b test', 'variant a', 'variant b', 'clarity audit', 'differentiation check', 'conversion lift', 'campaign summary']
    const signalCount = analystSignals.filter(s => lower.includes(s)).length
    if (signalCount >= 2) return 'analyst'
  }

  if (currentPhase === 'analyst') {
    // If there's a campaign_create block, transition to complete
    if (content.includes('```campaign_create')) return 'complete'
  }

  return null
}

/**
 * Build campaign summaries string for context injection
 */
function buildCampaignsSummary(
  campaigns: Record<string, unknown>[],
  audienceMap: Record<string, Record<string, unknown>>,
  creativesMap: Record<string, Record<string, unknown>>,
): string {
  if (campaigns.length === 0) return ''

  return campaigns.map((c) => {
    const id = c.id as string
    const audience = audienceMap[id]
    const creative = creativesMap[id]
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
    return `- "${c.title}" (Status: ${c.status})
  Goal: ${c.goal ?? '—'} | Budget: daily=₹${c.daily_budget ?? '—'} total=₹${c.total_budget ?? '—'}
  Audience: ${ageRange}${location}${interests || ' —'}
  Creative:${headline || ' —'}${cta}
  Metrics: spend=₹${Number(c.spend) || 0} | impressions=${Number(c.impressions) || 0} | clicks=${Number(c.clicks) || 0} | conversions=${Number(c.conversions) || 0}`
  }).join('\n\n')
}

export async function POST(request: Request) {
  try {
    // ─── AUTH ──────────────────────────────────────────
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const service = createServiceClient()

    // ─── BRAND PROFILE ────────────────────────────────
    const { data: profile } = await service
      .from('profiles')
      .select('role, brand_data')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'brand') {
      return NextResponse.json({ error: 'Unauthorized — Brand access required' }, { status: 403 })
    }

    // ─── PARSE REQUEST ────────────────────────────────
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = chatSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid message format' }, { status: 400 })
    }

    const { message, phase: currentPhase, conversationHistory = [] } = parsed.data

    // ─── BUILD BRAND CONTEXT ──────────────────────────
    const brandData = (profile.brand_data as Record<string, unknown>) || {}
    const brandContext: BrandContext = {
      companyName: (brandData.companyName as string) || 'Brand',
      brandType: (brandData.brandType as string) || 'Not specified',
      targetAudience: (brandData.targetAudience as string) || 'Not specified',
      vertical: (brandData.vertical as string) || 'Not specified',
      existingCampaignCount: 0,
      products: [],
    }

    // Fetch products for context
    const { data: products } = await service
      .from('products')
      .select('id, name, description, price, category')
      .eq('brand_id', user.id)
      .limit(20)

    if (products) {
      brandContext.products = products.map((p: Record<string, unknown>) => ({
        id: p.id as string,
        name: p.name as string,
        description: (p.description as string) || undefined,
        price: p.price != null ? Number(p.price) : undefined,
        category: (p.category as string) || undefined,
      }))
    }

    // Fetch existing campaigns for context
    const { data: campaignsList } = await service
      .from('campaigns')
      .select('*')
      .eq('brand_id', user.id)
      .order('created_at', { ascending: false })

    const campaigns = campaignsList || []
    brandContext.existingCampaignCount = campaigns.length
    const campaignIds = campaigns.map((c: { id: string }) => c.id)

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

    const campaignsSummary = buildCampaignsSummary(
      campaigns as Record<string, unknown>[],
      audienceByCampaign,
      creativesByCampaign,
    )

    // ─── BUILD SYSTEM PROMPT ──────────────────────────
    const systemPrompt = buildStrategistSystemPrompt(
      brandContext,
      currentPhase as StrategistPhase,
      campaignsSummary,
    )

    // ─── CALL OPENAI ──────────────────────────────────
    const openai = getOpenAI()
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 3000,
    })

    const responseContent =
      completion.choices[0]?.message?.content ||
      'I apologize, but I could not generate a response. Please try again.'

    // ─── DETECT PHASE TRANSITION ──────────────────────
    const newPhase = detectPhaseTransition(responseContent, currentPhase as StrategistPhase)

    // ─── DETECT CAMPAIGN PAYLOAD ──────────────────────
    const campaignPayload = parseCampaignPayload(responseContent)

    // ─── AUTO-CREATE CAMPAIGN IF PAYLOAD EXISTS ───────
    let createdCampaignId: string | null = null

    if (campaignPayload) {
      try {
        const goalMap: Record<string, CampaignGoal> = {
          sales: 'sales',
          awareness: 'awareness',
          launch: 'launch',
          traffic: 'traffic',
        }
        const goal = goalMap[campaignPayload.goal] || 'awareness'
        const budgetType = (campaignPayload.budget?.budget_type || 'daily') as BudgetType

        // Build the strategy JSON to store
        const strategyJson = {
          positioning: campaignPayload.positioning,
          funnel: campaignPayload.funnel,
          content_angles: campaignPayload.content_angles,
          ab_variants: campaignPayload.ab_variants,
          hooks: campaignPayload.creative?.hooks,
          scripts: campaignPayload.creative?.scripts,
          recommended_platforms: campaignPayload.budget?.recommended_platforms,
        }

        const { data: newCampaign, error: insertError } = await service
          .from('campaigns')
          .insert({
            brand_id: user.id,
            title: campaignPayload.title,
            brief: campaignPayload.brief,
            strategy: strategyJson,
            status: 'draft',
            goal,
            budget_type: budgetType,
            daily_budget: campaignPayload.budget?.daily_budget ?? null,
            total_budget: campaignPayload.budget?.total_budget ?? null,
          })
          .select('id')
          .single()

        if (!insertError && newCampaign) {
          createdCampaignId = newCampaign.id

          // Insert audience
          await service.from('campaign_audience').insert({
            campaign_id: newCampaign.id,
            age_min: campaignPayload.audience?.age_min ?? null,
            age_max: campaignPayload.audience?.age_max ?? null,
            gender: campaignPayload.audience?.gender ?? null,
            location: campaignPayload.audience?.location ?? null,
            interests: campaignPayload.audience?.interests ?? [],
          }).then(res => {
            if (res.error) console.warn('Audience insert skipped:', res.error.message)
          })

          // Insert creative
          await service.from('campaign_creatives').insert({
            campaign_id: newCampaign.id,
            headline: campaignPayload.creative?.headline ?? null,
            description: campaignPayload.creative?.description ?? null,
            cta_text: campaignPayload.creative?.cta_text ?? null,
            creative_assets: [],
          }).then(res => {
            if (res.error) console.warn('Creatives insert skipped:', res.error.message)
          })

          console.log(`✅ Campaign auto-created: ${newCampaign.id} — "${campaignPayload.title}"`)
        } else if (insertError) {
          console.error('Campaign auto-create failed:', insertError)
        }
      } catch (err) {
        console.error('Campaign auto-create error:', err)
      }
    }

    // ─── CLEAN RESPONSE (remove phase markers) ────────
    const cleanedResponse = responseContent
      .replace(/\[PHASE:\w+\]/g, '')
      .trim()

    // ─── RETURN ───────────────────────────────────────
    return NextResponse.json({
      response: cleanedResponse,
      phase: newPhase || currentPhase,
      campaignPayload: campaignPayload || null,
      createdCampaignId,
    })
  } catch (error) {
    console.error('Campaign strategist error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
