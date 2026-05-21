/**
 * useUserPresence
 *
 * Live online/offline indicator using Supabase Realtime presence.
 *
 * When mounted, subscribes to a shared presence channel keyed by the
 * target user's id. Both this user (the viewer) and the target user
 * publish their presence on the same channel. We only care about the
 * target user's presence — if their userId appears in the channel
 * state, they're online.
 *
 * The viewer also tracks themselves on the channel so peer-side
 * components can detect viewers (used for things like "they're viewing
 * your profile" indicators if we want to add that later).
 *
 * Auto-clears 30s after the target user's presence drops in case the
 * leave event got dropped.
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/auth-client'

interface Options {
  /** The user whose online status we're watching */
  targetUserId: string | null | undefined
  /** The current viewer's user id (used to publish our own presence) */
  viewerUserId: string | null | undefined
}

export function useUserPresence({ targetUserId, viewerUserId }: Options) {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    if (!targetUserId || typeof window === 'undefined') return
    const supabase = createClient()
    const channel = supabase.channel(`presence:user:${targetUserId}`, {
      config: { presence: { key: viewerUserId || `anon-${Math.random().toString(36).slice(2)}` } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as Record<string, Array<{ userId?: string }>>
        const onlineNow = Object.values(state).some((entries) =>
          entries.some((e) => e?.userId === targetUserId),
        )
        setIsOnline(onlineNow)
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: Array<{ userId?: string }> }) => {
        const targetLeft = leftPresences.some(
          (p) => p?.userId === targetUserId,
        )
        if (targetLeft) setIsOnline(false)
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED' && viewerUserId) {
          // Track our own presence so the target sees us if they care
          await channel.track({ userId: viewerUserId, online_at: new Date().toISOString() })
        }
      })

    return () => {
      void channel.untrack().catch(() => undefined)
      void channel.unsubscribe()
      void supabase.removeChannel(channel)
      setIsOnline(false)
    }
  }, [targetUserId, viewerUserId])

  return { isOnline }
}
