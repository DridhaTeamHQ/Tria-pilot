import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'

const bodySchema = z
    .object({
        // Role is required for first-time profile setup, ignored for existing profiles.
        role: z.enum(['influencer', 'brand']).optional(),
        name: z.string().trim().min(1).max(120),
    })
    .strict()

/**
 * Complete profile setup — first-time onboarding only.
 *
 * Security: this endpoint MUST only run for users whose profile does not yet
 * have a role set, OR whose role matches the supplied value. Otherwise any
 * authenticated user could POST { role: 'brand' } and instantly become an
 * approved brand, bypassing admin approval.
 *
 * Brands are no longer auto-approved here — they go through the same
 * pending → approved workflow as influencers.
 */
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

        const json = await request.json().catch(() => null)
        const parsed = bodySchema.safeParse(json)
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
        }
        const { role: requestedRole, name } = parsed.data

        // Use service client to read the existing profile so RLS doesn't hide it.
        const service = createServiceClient()
        const { data: existing } = await service
            .from('profiles')
            .select('id, role, approval_status, onboarding_completed')
            .eq('id', user.id)
            .maybeSingle()

        const existingRole = (existing?.role || '').toLowerCase()

        // ── Privilege escalation guard ───────────────────────────────────────
        // If the user already has a role assigned, only allow re-submission
        // with the SAME role. Reject attempts to switch roles via this endpoint.
        if (existingRole && requestedRole && existingRole !== requestedRole) {
            return NextResponse.json(
                { error: 'Role already set; cannot be changed via this endpoint.' },
                { status: 403 }
            )
        }

        // Determine the role to write: prefer existing if set, else use requested.
        const finalRole = existingRole || requestedRole
        if (!finalRole) {
            return NextResponse.json(
                { error: 'Role is required for first-time profile setup.' },
                { status: 400 }
            )
        }

        // ── Approval-status guard ────────────────────────────────────────────
        // Never elevate approval_status here. Always start as 'pending' for new
        // profiles. Existing approval_status is preserved if already set.
        // Brands MUST go through admin approval — same as influencers.
        const finalApprovalStatus = existing?.approval_status || 'pending'

        const { error: profileError } = await service.from('profiles').upsert(
            {
                id: user.id,
                email: user.email,
                role: finalRole,
                full_name: name.trim(),
                onboarding_completed: existing?.onboarding_completed || false,
                approval_status: finalApprovalStatus,
            },
            { onConflict: 'id' }
        )

        if (profileError) {
            console.error('Failed to complete profile:', profileError)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('complete-profile error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
