'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/auth-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useUser } from '@/lib/react-query/hooks'
import { useRouter } from 'next/navigation'

// Create ONE stable Supabase client (module-level singleton)
const supabase = createClient()

export function RealtimeListener() {
    const queryClient = useQueryClient()
    const { data: user } = useUser()
    const router = useRouter()
    // Track the active channel to avoid recreating on every render
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
    const activeUserIdRef = useRef<string | null>(null)

    useEffect(() => {
        if (!user?.id) return

        // Don't recreate channel if already subscribed for this user
        if (activeUserIdRef.current === user.id && channelRef.current) {
            return
        }

        // Clean up previous channel if user changed
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
        }

        activeUserIdRef.current = user.id

        const channel = supabase.channel(`user-updates-${user.id}`)
        channelRef.current = channel

        channel
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    queryClient.invalidateQueries({ queryKey: ['notifications'] })
                    toast.info('New notification received')
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'generations',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    queryClient.invalidateQueries({ queryKey: ['generations'] })

                    if (payload.new?.status === 'completed' && payload.old.status !== 'completed') {
                        toast.success('Try-on generation completed!', {
                            action: {
                                label: 'View',
                                onClick: () => router.push('/influencer/try-on?view=gallery')
                            }
                        })
                    }

                    if (payload.new?.status === 'failed' && payload.old.status !== 'failed') {
                        toast.error('Generation failed: ' + (payload.new.error_message || 'Unknown error'))
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`,
                },
                (payload: any) => {
                    queryClient.invalidateQueries({ queryKey: ['user'] })

                    if (payload.new.approval_status === 'approved' && payload.old.approval_status !== 'approved') {
                        toast.success("You've been approved! Welcome to Kiwikoo.")
                        router.refresh()
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime updates connected')
                } else if (status === 'CHANNEL_ERROR') {
                    console.warn('⚠️ Realtime channel error — will retry automatically')
                }
            })

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                channelRef.current = null
                activeUserIdRef.current = null
            }
        }
    }, [user?.id, queryClient, router])

    return null
}
