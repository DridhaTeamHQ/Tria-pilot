'use client'

import { useEffect, useRef } from 'react'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/auth-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/simple-sonner'
import { useUser } from '@/lib/react-query/hooks'
import { useRouter } from 'next/navigation'

export function RealtimeListener() {
    const queryClient = useQueryClient()
    const { data: user } = useUser()
    const router = useRouter()
    // Track the active channel to avoid recreating on every render
    const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
    const activeUserIdRef = useRef<string | null>(null)
    const lastKnownAuthUserIdRef = useRef<string | null>(null)
    const authSyncReadyRef = useRef(false)

    useEffect(() => {
        lastKnownAuthUserIdRef.current = user?.id ?? null
    }, [user?.id])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const supabase = createClient()
        let disposed = false

        const syncQueriesAndRoute = () => {
            queryClient.invalidateQueries({ queryKey: ['user'] })
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
            queryClient.invalidateQueries({ queryKey: ['favorites'] })
            queryClient.invalidateQueries({ queryKey: ['generations'] })
            router.refresh()
        }

        supabase.auth.getUser().then(({ data }: { data: { user: { id?: string | null } | null } }) => {
            if (disposed) return
            lastKnownAuthUserIdRef.current = data.user?.id ?? null
            authSyncReadyRef.current = true
        }).catch(() => {
            if (disposed) return
            authSyncReadyRef.current = true
        })

        const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
            const nextUserId = session?.user?.id ?? null
            const previousUserId = lastKnownAuthUserIdRef.current
            lastKnownAuthUserIdRef.current = nextUserId

            if (event === 'INITIAL_SESSION') {
                authSyncReadyRef.current = true
                return
            }

            syncQueriesAndRoute()

            if (!authSyncReadyRef.current || previousUserId === nextUserId) {
                authSyncReadyRef.current = true
                return
            }

            if (previousUserId && nextUserId) {
                toast.info('This tab switched to a different account because you logged in elsewhere.')
            } else if (previousUserId && !nextUserId) {
                toast.info('You were signed out in another tab.')
            } else if (!previousUserId && nextUserId) {
                toast.info('You signed in from another tab. Refreshing this session now.')
            }
        })

        const handleVisibilityChange = () => {
            if (document.visibilityState !== 'visible') return
            syncQueriesAndRoute()
        }

        window.addEventListener('focus', handleVisibilityChange)
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            disposed = true
            authListener.subscription.unsubscribe()
            window.removeEventListener('focus', handleVisibilityChange)
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [queryClient, router])

    useEffect(() => {
        if (typeof window === 'undefined') return
        if (!user?.id) return

        const supabase = createClient()

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
                (_payload: unknown) => {
                    queryClient.invalidateQueries({ queryKey: ['notifications'] })
                    toast.info('New notification received')
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'generation_jobs',
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
                    }
                }
            )
            .subscribe((status: string) => {
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
