/**
 * useTypingIndicator
 *
 * Whatsapp-style typing indicator built on Supabase Realtime broadcast
 * channels. Broadcast events are ephemeral — they never touch the
 * database, so this works regardless of whether the supabase_realtime
 * publication is configured.
 *
 * Usage:
 *   const { peerTyping, notifyTyping } = useTypingIndicator({
 *     conversationId,
 *     userId: currentUserId,
 *   })
 *
 *   <input onChange={(e) => { setText(e.target.value); notifyTyping() }} />
 *   {peerTyping && <TypingBubble />}
 *
 * Implementation notes:
 *  - Each conversation has its own channel: `typing:<conversationId>`.
 *  - We throttle outgoing broadcasts to once per 1.5s so a user mashing
 *    keys doesn't flood the channel.
 *  - peerTyping auto-clears 3s after the last received event so the
 *    bubble disappears even if the peer's "stopped typing" event is lost.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/auth-client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Options {
  conversationId: string | null | undefined
  userId: string | null | undefined
}

interface TypingPayload {
  userId: string
  ts: number
}

const THROTTLE_MS = 1500
const PEER_TIMEOUT_MS = 3000

export function useTypingIndicator({ conversationId, userId }: Options) {
  const [peerTyping, setPeerTyping] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastSentRef = useRef<number>(0)
  const peerClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Subscribe to the conversation's typing channel
  useEffect(() => {
    if (!conversationId || typeof window === 'undefined') return
    const supabase = createClient()
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'typing' }, (payload: { payload: TypingPayload }) => {
        const data = payload?.payload
        if (!data || !data.userId) return
        if (data.userId === userId) return // ignore our own echoes
        setPeerTyping(true)
        if (peerClearTimerRef.current) clearTimeout(peerClearTimerRef.current)
        peerClearTimerRef.current = setTimeout(() => {
          setPeerTyping(false)
        }, PEER_TIMEOUT_MS)
      })
      .on('broadcast', { event: 'stop_typing' }, (payload: { payload: TypingPayload }) => {
        const data = payload?.payload
        if (!data || !data.userId) return
        if (data.userId === userId) return
        if (peerClearTimerRef.current) clearTimeout(peerClearTimerRef.current)
        setPeerTyping(false)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (peerClearTimerRef.current) {
        clearTimeout(peerClearTimerRef.current)
        peerClearTimerRef.current = null
      }
      supabase.removeChannel(channel)
      channelRef.current = null
      setPeerTyping(false)
    }
  }, [conversationId, userId])

  // Throttled broadcast: call this on every keystroke
  const notifyTyping = useCallback(() => {
    if (!channelRef.current || !userId || !conversationId) return
    const now = Date.now()
    if (now - lastSentRef.current < THROTTLE_MS) return
    lastSentRef.current = now
    channelRef.current
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, ts: now } satisfies TypingPayload,
      })
      .catch(() => {
        // Realtime may not be subscribed yet — silent
      })
  }, [conversationId, userId])

  // Optional explicit "stopped typing" — useful right after sending
  const notifyStoppedTyping = useCallback(() => {
    if (!channelRef.current || !userId || !conversationId) return
    lastSentRef.current = 0
    channelRef.current
      .send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { userId, ts: Date.now() } satisfies TypingPayload,
      })
      .catch(() => {
        // ignore
      })
  }, [conversationId, userId])

  return { peerTyping, notifyTyping, notifyStoppedTyping }
}
