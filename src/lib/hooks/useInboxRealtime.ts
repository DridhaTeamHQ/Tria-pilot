/**
 * useInboxRealtime
 *
 * Live messaging via Supabase Realtime (postgres_changes channel).
 * Subscribes to:
 *   - messages INSERT: notifies when a new message lands in any of the
 *     user's conversations (used to live-append to the active thread + bump
 *     the conversation in the list)
 *   - conversations UPDATE: notifies when a conversation's last_message,
 *     unread counters, or last_message_at changes (used to keep the list
 *     in sync without polling)
 *
 * Both /inbox and /brand/inbox use this. The hook is a thin pub/sub —
 * callers pass `onMessage` and `onConversationUpdate` and decide what to
 * do with the payload.
 */

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/auth-client'

type MessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read?: boolean
}

type ConversationRow = {
  id: string
  brand_id: string
  influencer_id: string
  last_message: string | null
  last_message_at: string | null
  unread_brand: number | null
  unread_influencer: number | null
}

interface Options {
  /** The current viewer's user id. If null, the hook does nothing. */
  userId: string | null | undefined
  /** Called when a new message row lands in any of the user's conversations. */
  onMessage?: (row: MessageRow) => void
  /** Called when a conversations row updates (e.g. unread count, last message). */
  onConversationUpdate?: (row: ConversationRow) => void
}

export function useInboxRealtime({ userId, onMessage, onConversationUpdate }: Options) {
  const onMessageRef = useRef(onMessage)
  const onConvRef = useRef(onConversationUpdate)

  // Keep refs fresh so we can use a stable subscription
  useEffect(() => {
    onMessageRef.current = onMessage
    onConvRef.current = onConversationUpdate
  }, [onMessage, onConversationUpdate])

  useEffect(() => {
    if (typeof window === 'undefined' || !userId) return

    const supabase = createClient()
    const channelName = `inbox-${userId}`
    const channel = supabase.channel(channelName)

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: { new: MessageRow }) => {
          // We can't filter messages by user_id in postgres (the user is
          // referenced via the parent conversation's brand_id/influencer_id),
          // so let the caller decide whether the row is relevant.
          if (payload?.new) onMessageRef.current?.(payload.new)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `brand_id=eq.${userId}`,
        },
        (payload: { new: ConversationRow }) => {
          if (payload?.new) onConvRef.current?.(payload.new)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `influencer_id=eq.${userId}`,
        },
        (payload: { new: ConversationRow }) => {
          if (payload?.new) onConvRef.current?.(payload.new)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `brand_id=eq.${userId}`,
        },
        (payload: { new: ConversationRow }) => {
          if (payload?.new) onConvRef.current?.(payload.new)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversations',
          filter: `influencer_id=eq.${userId}`,
        },
        (payload: { new: ConversationRow }) => {
          if (payload?.new) onConvRef.current?.(payload.new)
        },
      )
      .subscribe()

    return () => {
      void channel.unsubscribe()
      void supabase.removeChannel(channel)
    }
  }, [userId])
}
