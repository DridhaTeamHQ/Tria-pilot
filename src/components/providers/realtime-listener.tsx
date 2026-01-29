'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/auth-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUser } from '@/lib/react-query/hooks'
import { useRouter } from 'next/navigation'

export function RealtimeListener() {
    const supabase = createClient()
    const queryClient = useQueryClient()
    const { data: user } = useUser()
    const router = useRouter()

    useEffect(() => {
        if (!user?.id) return

        // Create a single channel for all user-related events
        const channel = supabase.channel(`user-updates-${user.id}`)

        channel
            // Listen for new notifications
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('🔔 Realtime notification:', payload)
                    // Invalidate notifications query to re-fetch count
                    queryClient.invalidateQueries({ queryKey: ['notifications'] })

                    // Optional: Show toast for distinct notification types
                    // We rely on the hook/UI to show the badge, but a toast feels nice too
                    toast.info('New notification received')
                }
            )
            // Listen for generation updates (completion/failure)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'generations',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    console.log('✨ Realtime generation update:', payload)
                    queryClient.invalidateQueries({ queryKey: ['generations'] })

                    // Check if status changed to completed
                    if (payload.new && payload.new.status === 'completed' && payload.old.status !== 'completed') {
                        toast.success('Try-on generation completed!', {
                            action: {
                                label: 'View',
                                onClick: () => router.push('/influencer/try-on?view=gallery')
                            }
                        })
                    }

                    // Check for failure
                    if (payload.new && payload.new.status === 'failed' && payload.old.status !== 'failed') {
                        toast.error('Generation failed: ' + (payload.new.error_message || 'Unknown error'))
                    }
                }
            )
            // Listen for profile status updates (Approval)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`,
                },
                (payload: any) => {
                    console.log('👤 Realtime profile update:', payload)
                    // Refresh user data (session/auth check relying on profile)
                    queryClient.invalidateQueries({ queryKey: ['user'] })

                    // If approved, notify
                    if (payload.new.approval_status === 'approved' && payload.old.approval_status !== 'approved') {
                        toast.success("You've been approved! Welcome to Kiwikoo.")
                        router.refresh() // Force server component refresh
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime updates connected')
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [supabase, queryClient, user?.id, router])

    return null // Renderless component
}
