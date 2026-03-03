/**
 * INFLUENCERS API FOR BRANDS
 * 
 * GET - List approved influencers with filters
 * Uses Supabase only
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const search = searchParams.get('search') || ''
        const niche = searchParams.get('niche') || ''
        const minFollowers = parseInt(searchParams.get('minFollowers') || '0')
        const maxFollowers = parseInt(searchParams.get('maxFollowers') || '999999999')
        const sortBy = searchParams.get('sortBy') || 'followers'
        const order = searchParams.get('order') || 'desc'

        const service = createServiceClient()

        // First get all approved influencer profiles
        let query = service
            .from('profiles')
            .select('id, email, role, onboarding_completed, approval_status, created_at')
            .eq('role', 'influencer')
            .eq('approval_status', 'approved')
            .eq('onboarding_completed', true)

        const { data: profiles, error: profilesError } = await query

        if (profilesError) {
            console.error('Profiles fetch error:', profilesError)
            return NextResponse.json({ error: 'Failed to fetch influencers' }, { status: 500 })
        }

        // For now, return basic profile data
        // In production, you'd join with influencer_profiles table for detailed metrics
        const influencers = (profiles || []).map(profile => ({
            id: profile.id,
            email: profile.email,
            name: profile.email.split('@')[0], // Placeholder
            bio: 'Influencer on the platform',
            followers: Math.floor(Math.random() * 100000) + 1000, // Placeholder until real data
            engagement_rate: (Math.random() * 5 + 1).toFixed(2),
            niches: ['Fashion', 'Lifestyle'],
            profile_image: null,
            approved_at: profile.created_at,
        }))

        // Apply filters
        let filtered = influencers

        if (search) {
            const searchLower = search.toLowerCase()
            filtered = filtered.filter(inf =>
                inf.name.toLowerCase().includes(searchLower) ||
                inf.email.toLowerCase().includes(searchLower)
            )
        }

        if (minFollowers > 0) {
            filtered = filtered.filter(inf => inf.followers >= minFollowers)
        }

        if (maxFollowers < 999999999) {
            filtered = filtered.filter(inf => inf.followers <= maxFollowers)
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'followers') {
                return order === 'desc' ? b.followers - a.followers : a.followers - b.followers
            }
            if (sortBy === 'engagement') {
                return order === 'desc'
                    ? parseFloat(b.engagement_rate) - parseFloat(a.engagement_rate)
                    : parseFloat(a.engagement_rate) - parseFloat(b.engagement_rate)
            }
            return 0
        })

        return NextResponse.json({ influencers: filtered })
    } catch (error) {
        console.error('Influencers API error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
