import { NextResponse } from 'next/server'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getOpenAI } from '@/lib/openai'

const openai = getOpenAI()

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: authUser.email! },
      include: {
        brandProfile: true,
        campaigns: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!dbUser || dbUser.role !== 'BRAND' || !dbUser.brandProfile) {
      return NextResponse.json({ error: 'Unauthorized - Brand access required' }, { status: 403 })
    }

    const body = await request.json()
    const { message, conversationHistory = [] } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get brand context
    const brandContext = {
      companyName: dbUser.brandProfile.companyName,
      brandType: dbUser.brandProfile.brandType,
      targetAudience: dbUser.brandProfile.targetAudience,
      productTypes: dbUser.brandProfile.productTypes,
      vertical: dbUser.brandProfile.vertical,
      budgetRange: dbUser.brandProfile.budgetRange,
      recentCampaigns: dbUser.campaigns.map((c: any) => ({
        title: c.title,
        brief: c.brief,
        status: c.status,
      })),
    }

    // Get available influencers count for suggestions
    const influencerCount = await prisma.influencerProfile.count({
      where: {
        portfolioVisibility: true,
        onboardingCompleted: true,
      },
    })

    // Build system prompt
    const systemPrompt = `You are an intelligent campaign assistant for brands on Kiwikoo, an AI fashion try-on marketplace. Your role is to help brands create effective marketing campaigns, suggest influencers, plan budgets, and provide strategic advice.

Brand Context:
- Company: ${brandContext.companyName}
- Brand Type: ${brandContext.brandType || 'Not specified'}
- Target Audience: ${Array.isArray(brandContext.targetAudience) ? brandContext.targetAudience.join(', ') : 'Not specified'}
- Product Types: ${Array.isArray(brandContext.productTypes) ? brandContext.productTypes.join(', ') : 'Not specified'}
- Industry: ${brandContext.vertical || 'Not specified'}
- Budget Range: ${brandContext.budgetRange || 'Not specified'}
- Recent Campaigns: ${brandContext.recentCampaigns.length} campaigns

Available Influencers: ${influencerCount} influencers available on the platform

Your capabilities:
1. Generate campaign ideas and briefs
2. Suggest content strategies
3. Recommend influencers based on brand needs
4. Help with budget planning and ROI estimates
5. Provide timeline and scheduling suggestions
6. Answer questions about campaign strategy

Be concise, actionable, and specific. When suggesting influencers, mention criteria like niche, audience, follower count, or engagement rate. When discussing budgets, provide realistic estimates based on the brand's budget range.`

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

