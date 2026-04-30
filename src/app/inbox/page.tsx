/**
 * INBOX (influencer + general) — full messaging UI
 *
 * Mirrors /brand/inbox but shared for influencers and any non-brand user.
 * Supports deep-linking via ?thread=<conversationId> (used by the
 * NotificationBell when a new chat message arrives) and ?to=<userId> to
 * start a new conversation.
 *
 * The notifications panel is intentionally NOT here — that lives in the
 * NotificationBell dropdown so this screen stays focused on conversations.
 */
'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from '@/lib/simple-sonner'
import {
  Inbox as InboxIcon,
  Search,
  Send,
  Loader2,
  MessageCircle,
  ChevronLeft,
  Wifi,
} from 'lucide-react'
import { useInboxRealtime } from '@/lib/hooks/useInboxRealtime'

interface Conversation {
  id: string
  other_party: { id: string; name: string; email: string }
  last_message?: string
  last_message_at?: string
  unread_count: number
}

interface Message {
  id: string
  sender_id: string
  content: string
  created_at: string
  read: boolean
}

function formatTime(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-IN', { weekday: 'short' })
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function InboxInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Initial load
  useEffect(() => {
    let cancelled = false
    const init = async () => {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' })
        const meData = await meRes.json().catch(() => ({}))
        if (!cancelled && meRes.ok && meData.user) setCurrentUserId(meData.user.id)
      } catch {
        // ignore
      }
      try {
        const res = await fetch('/api/conversations', { credentials: 'include' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to load')
        if (!cancelled) setConversations(data.conversations || [])
      } catch (err) {
        console.error(err)
        if (!cancelled) toast.error('Failed to load conversations')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const refreshConversations = async (): Promise<Conversation[]> => {
    try {
      const res = await fetch('/api/conversations', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'failed')
      const list: Conversation[] = data.conversations || []
      setConversations(list)
      return list
    } catch {
      return []
    }
  }

  const startConversation = async (recipientId: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ recipient_id: recipientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error)

      const next = await refreshConversations()
      const conv =
        next.find((c) => c.other_party.id === recipientId) ||
        ({
          id: data.conversation.id,
          other_party: { id: recipientId, name: 'User', email: '' },
          unread_count: 0,
        } as Conversation)

      void selectConversation(conv)
      router.replace('/inbox')
    } catch (err) {
      console.error(err)
      toast.error('Failed to start conversation')
    }
  }

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setMessages([])
    try {
      const res = await fetch(`/api/conversations/${conversation.id}/messages`, {
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error)
      setMessages(data.messages || [])
      setConversations((prev) =>
        prev.map((c) => (c.id === conversation.id ? { ...c, unread_count: 0 } : c)),
      )
    } catch (err) {
      console.error(err)
      toast.error('Failed to load messages')
    }
  }

  // Handle ?thread=<id> deep-link from NotificationBell
  useEffect(() => {
    const threadId = searchParams.get('thread')
    if (!threadId || conversations.length === 0) return
    if (selectedConversation?.id === threadId) return
    const match = conversations.find((c) => c.id === threadId)
    if (match) {
      void selectConversation(match)
    }
  }, [searchParams, conversations]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle ?to=<userId> to start a new conversation
  useEffect(() => {
    const toId = searchParams.get('to')
    if (!toId || !currentUserId) return
    void startConversation(toId)
  }, [searchParams, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Live updates via Supabase Realtime ─────────────────────────────────
  const handleRealtimeMessage = useCallback(
    (row: { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; read?: boolean }) => {
      // Only care if this conversation belongs to this user
      const isMine = conversations.some((c) => c.id === row.conversation_id)
      if (!isMine) return

      // If it's the active thread, append (de-dupe by id, ignore our own optimistic echo)
      if (selectedConversation?.id === row.conversation_id && row.sender_id !== currentUserId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev
          return [
            ...prev,
            {
              id: row.id,
              sender_id: row.sender_id,
              content: row.content,
              created_at: row.created_at,
              read: Boolean(row.read),
            },
          ]
        })
      }

      // Bump the conversation in the list with a fresh preview + unread badge
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === row.conversation_id
            ? {
                ...c,
                last_message: row.content.slice(0, 100),
                last_message_at: row.created_at,
                unread_count:
                  // Only increment unread if the message isn't from me AND
                  // we don't currently have that thread open.
                  row.sender_id === currentUserId || selectedConversation?.id === row.conversation_id
                    ? c.unread_count
                    : (c.unread_count || 0) + 1,
              }
            : c,
        )
        // Re-sort so the freshest conversation surfaces to the top
        return [...next].sort((a, b) => {
          const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
          const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
          return tb - ta
        })
      })
    },
    [conversations, selectedConversation, currentUserId],
  )

  useInboxRealtime({
    userId: currentUserId,
    onMessage: handleRealtimeMessage,
  })

  // ── Aggressive polling fallback ─────────────────────────────────────────
  // Realtime needs the tables to be in the supabase_realtime publication.
  // If a Supabase project hasn't enabled that yet (or the channel drops),
  // fall back to polling every 3s while the tab is visible. This guarantees
  // delivery even when Realtime is misconfigured.
  useEffect(() => {
    if (!currentUserId) return

    const pollActiveThread = async () => {
      if (document.hidden) return
      if (!selectedConversation) {
        // Just refresh the conversation list
        try {
          const res = await fetch('/api/conversations', { credentials: 'include' })
          if (!res.ok) return
          const data = await res.json()
          setConversations(data.conversations || [])
        } catch {
          /* ignore */
        }
        return
      }
      try {
        const res = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
          credentials: 'include',
        })
        if (!res.ok) return
        const data = await res.json()
        const incoming: Message[] = data.messages || []
        setMessages((prev) => {
          // Merge: keep optimistic temp-* messages, dedupe by id
          const seen = new Set(incoming.map((m) => m.id))
          const optimisticOnly = prev.filter((m) => m.id.startsWith('temp-') && !seen.has(m.id))
          return [...incoming, ...optimisticOnly]
        })
      } catch {
        /* ignore */
      }
      // Refresh the conversation list too so previews + ordering stay current
      try {
        const res = await fetch('/api/conversations', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        setConversations((prev) => {
          const next: Conversation[] = data.conversations || []
          // Preserve optimistic unread reset when active thread is open
          if (selectedConversation) {
            return next.map((c) =>
              c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c,
            )
          }
          return next
        })
      } catch {
        /* ignore */
      }
    }

    const id = setInterval(pollActiveThread, 3_000)
    // Also poll immediately when tab becomes visible after being hidden
    const onVisibility = () => {
      if (!document.hidden) pollActiveThread()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [currentUserId, selectedConversation])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation || sending) return

    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId || '',
      content,
      created_at: new Date().toISOString(),
      read: false,
    }
    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error)
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? data.message : m)))
      const sentAt = data.message?.created_at || optimistic.created_at
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversation.id ? { ...c, last_message: content, last_message_at: sentAt } : c,
        ),
      )
    } catch (err) {
      console.error(err)
      toast.error('Failed to send message')
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      setNewMessage(content)
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter(
      (c) =>
        c.other_party.name.toLowerCase().includes(q) ||
        c.other_party.email.toLowerCase().includes(q) ||
        (c.last_message || '').toLowerCase().includes(q),
    )
  }, [conversations, searchQuery])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-black text-black flex items-center">
          <InboxIcon className="inline-block w-8 h-8 mr-2 -mt-1" />
          Inbox
        </h1>
        <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#B4F056]/30 border border-black text-[10px] font-black uppercase tracking-wider">
          <Wifi className="w-3 h-3" strokeWidth={3} />
          <span>Live</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] animate-pulse" />
        </div>
      </div>

      <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex min-h-[68dvh] lg:h-[calc(100dvh-220px)] overflow-hidden">
        {/* Conversations list */}
        <div
          className={`w-full md:w-80 border-r-[3px] border-black flex flex-col ${
            selectedConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b-2 border-black">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-4 py-2 border-2 border-black text-sm font-medium focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="p-6 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-black/20" />
                <p className="text-black/60 font-medium text-sm">
                  {searchQuery.trim() ? 'No matching conversations' : 'No conversations yet'}
                </p>
                <p className="text-black/40 text-xs mt-1">
                  {searchQuery.trim()
                    ? 'Try a different name or email'
                    : 'A brand will reach out via the inbox'}
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const active = selectedConversation?.id === conv.id
                return (
                  <button
                    type="button"
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`group relative w-full p-4 text-left border-b border-black/10 transition-all duration-200 ${
                      active
                        ? 'bg-[#B4F056]/25'
                        : 'hover:bg-[#FFD93D]/15'
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-0 bottom-0 w-1 bg-black" />
                    )}
                    <div className="flex items-start gap-3">
                      <div className={`relative w-11 h-11 bg-gradient-to-br from-[#B4F056] to-[#FFD93D] border-2 border-black flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${active ? 'shadow-[2px_2px_0_0_rgba(0,0,0,1)]' : ''}`}>
                        <span className="font-black">
                          {conv.other_party.name.charAt(0).toUpperCase()}
                        </span>
                        {conv.unread_count > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-[#FF8C69] border-2 border-black text-[10px] font-black flex items-center justify-center rounded-full animate-bounce-subtle">
                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className={`truncate ${conv.unread_count > 0 ? 'font-black' : 'font-bold'}`}>
                            {conv.other_party.name}
                          </h3>
                          {conv.last_message_at && (
                            <span className="text-[10px] text-black/40 shrink-0 font-bold uppercase tracking-wider">
                              {formatTime(conv.last_message_at)}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-sm truncate mt-0.5 ${
                            conv.unread_count > 0 ? 'text-black font-semibold' : 'text-black/60'
                          }`}
                        >
                          {conv.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Messages area */}
        <div
          className={`flex-1 flex flex-col ${
            selectedConversation ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedConversation ? (
            <>
              <div className="p-4 border-b-2 border-black flex items-center gap-3 bg-[#F9F8F4]">
                <button
                  type="button"
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-black/5 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="relative w-10 h-10 bg-gradient-to-br from-[#B4F056] to-[#FFD93D] border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                  <span className="font-black">
                    {selectedConversation.other_party.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#16a34a] border-2 border-white rounded-full" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-black truncate">{selectedConversation.other_party.name}</h2>
                  <p className="text-[11px] text-black/60 truncate font-semibold">
                    {selectedConversation.other_party.email}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="w-12 h-12 mx-auto mb-3 text-black/20" />
                      <p className="text-black/60 font-medium">No messages yet</p>
                      <p className="text-black/40 text-sm">Say hi 👋</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message, idx) => {
                    const isMine = message.sender_id === currentUserId
                    const prevSenderSame =
                      idx > 0 && messages[idx - 1].sender_id === message.sender_id
                    return (
                      <div
                        key={message.id}
                        className={`flex msg-enter ${isMine ? 'justify-end' : 'justify-start'} ${prevSenderSame ? 'mt-1' : 'mt-3'}`}
                      >
                        <div
                          className={`relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-transform ${
                            isMine
                              ? 'bg-[#B4F056] rounded-2xl rounded-br-sm'
                              : 'bg-white rounded-2xl rounded-bl-sm'
                          }`}
                        >
                          <p className="font-medium whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                          <p className="text-[10px] text-black/50 mt-1 text-right font-bold uppercase tracking-wider">
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={sendMessage}
                className="p-4 border-t-2 border-black flex items-end gap-2 bg-[#F9F8F4]"
              >
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 border-2 border-black font-medium bg-white rounded-xl focus:shadow-[3px_3px_0_0_rgba(0,0,0,1)] focus:-translate-y-0.5 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="h-[50px] w-[50px] flex items-center justify-center bg-[#B4F056] border-2 border-black rounded-xl shadow-[3px_3px_0_0_rgba(0,0,0,1)] hover:shadow-[5px_5px_0_0_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[1px_1px_0_0_rgba(0,0,0,1)] disabled:opacity-30 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none transition-all"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" strokeWidth={3} />
                  ) : (
                    <Send className="w-5 h-5" strokeWidth={3} />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <InboxIcon className="w-16 h-16 mx-auto mb-4 text-black/20" />
                <h3 className="text-xl font-black text-black/60 mb-2">Select a Conversation</h3>
                <p className="text-black/40 font-medium">
                  Pick a thread on the left, or open one from a notification.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .msg-enter { animation: msgIn 0.22s ease-out both; }

        @keyframes bounceSubtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        .animate-bounce-subtle { animation: bounceSubtle 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  )
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-black" />
        </div>
      }
    >
      <InboxInner />
    </Suspense>
  )
}
