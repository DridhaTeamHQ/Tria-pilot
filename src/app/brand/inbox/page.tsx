'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from '@/lib/simple-sonner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Inbox as InboxIcon,
  Search,
  Send,
  Loader2,
  MessageCircle,
  ChevronLeft,
  Wifi,
  Check,
  CheckCheck,
  MoreVertical,
  Phone,
  Video,
} from 'lucide-react'
import { useInboxRealtime } from '@/lib/hooks/useInboxRealtime'
import { useTypingIndicator } from '@/lib/hooks/useTypingIndicator'
import { TypingBubble } from '@/components/inbox/TypingBubble'
import { AppImage } from '@/components/ui/AppImage'
import { cn } from '@/lib/utils'

interface Conversation {
  id: string
  other_party: { id: string; name: string; email: string; avatar_url?: string | null }
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

function BrandInboxInner() {
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
      } catch { /* ignore */ }
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
    return () => { cancelled = true }
  }, [])

  // Brand-specific: Check for 'to' param to start new conversation
  useEffect(() => {
    const toId = searchParams.get('to')
    if (toId && currentUserId) {
      void startConversation(toId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentUserId])

  const startConversation = async (recipientId: string) => {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: recipientId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Refresh list
      const listRes = await fetch('/api/conversations', { credentials: 'include' })
      const listData = await listRes.json()
      const nextConversations = listData.conversations || []
      setConversations(nextConversations)

      const conv = nextConversations.find((c: any) => c.other_party.id === recipientId) || {
        id: data.conversation.id,
        other_party: { id: recipientId, name: 'User', email: '' },
        unread_count: 0,
      }
      void selectConversation(conv)
      router.replace('/brand/inbox')
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

  // Deep-linking (?thread=...)
  useEffect(() => {
    const threadId = searchParams.get('thread')
    if (!threadId || conversations.length === 0) return
    if (selectedConversation?.id === threadId) return
    const match = conversations.find((c) => c.id === threadId)
    if (match) void selectConversation(match)
  }, [searchParams, conversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime
  const handleRealtimeMessage = useCallback(
    (row: { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; read?: boolean }) => {
      if (!conversations.some((c) => c.id === row.conversation_id)) return
      if (selectedConversation?.id === row.conversation_id && row.sender_id !== currentUserId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === row.id)) return prev
          return [...prev, { ...row, read: Boolean(row.read) }]
        })
      }
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === row.conversation_id
            ? {
                ...c,
                last_message: row.content.slice(0, 100),
                last_message_at: row.created_at,
                unread_count: row.sender_id === currentUserId || selectedConversation?.id === row.conversation_id ? c.unread_count : (c.unread_count || 0) + 1,
              }
            : c,
        )
        return [...next].sort((a, b) => (new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime()))
      })
    },
    [conversations, selectedConversation, currentUserId],
  )

  useInboxRealtime({ userId: currentUserId, onMessage: handleRealtimeMessage })

  const { peerTyping, notifyTyping, notifyStoppedTyping } = useTypingIndicator({
    conversationId: selectedConversation?.id,
    userId: currentUserId,
  })

  // Aggressive polling fallback for brands
  useEffect(() => {
    if (!currentUserId) return
    const poll = async () => {
      if (document.hidden) return
      try {
        const res = await fetch('/api/conversations', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setConversations((prev) => {
            const next: Conversation[] = data.conversations || []
            if (selectedConversation) {
              return next.map((c) => (c.id === selectedConversation.id ? { ...c, unread_count: 0 } : c))
            }
            return next
          })
        }
      } catch { /* ignore */ }
      if (selectedConversation) {
        try {
          const res = await fetch(`/api/conversations/${selectedConversation.id}/messages`, { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            const incoming: Message[] = data.messages || []
            setMessages((prev) => {
              const seen = new Set(incoming.map((m) => m.id))
              const optimisticOnly = prev.filter((m) => m.id.startsWith('temp-') && !seen.has(m.id))
              return [...incoming, ...optimisticOnly]
            })
          }
        } catch { /* ignore */ }
      }
    }
    const id = setInterval(poll, 5_000)
    return () => clearInterval(id)
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
      notifyStoppedTyping()
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
    return conversations.filter((c) =>
      c.other_party.name.toLowerCase().includes(q) ||
      c.other_party.email.toLowerCase().includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
    )
  }, [conversations, searchQuery])

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Loader2 className="w-10 h-10 text-black" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center pt-6 pb-8 animate-fade-in">
      {/* Premium Inbox Container */}
      <div className="w-full max-w-[1440px] h-[calc(100vh-140px)] bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-[32px] overflow-hidden flex flex-col md:flex-row relative">
        
        {/* Left Sidebar - Conversation List */}
        <div className={cn(
          "w-full md:w-[380px] border-r-[3px] border-black flex flex-col bg-[#F9F8F4]/30 backdrop-blur-sm transition-all duration-300",
          selectedConversation ? "hidden md:flex" : "flex"
        )}>
          {/* Sidebar Header */}
          <div className="p-6 border-b-[3px] border-black">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-black text-black tracking-tight flex items-center gap-2">
                <InboxIcon className="w-7 h-7" />
                Inbox
              </h1>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B4F056] border-2 border-black text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Wifi className="w-3 h-3" strokeWidth={3} />
                <span>Live</span>
              </div>
            </div>
            
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40 group-focus-within:text-black transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-11 pr-4 py-3 bg-white border-[2.5px] border-black rounded-2xl text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] outline-none transition-all placeholder:text-black/30"
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {filteredConversations.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center p-8 opacity-40"
                >
                  <MessageCircle className="w-16 h-16 mb-4" />
                  <p className="font-black text-lg">No conversations</p>
                  <p className="text-sm font-bold">Message a creator to start</p>
                </motion.div>
              ) : (
                filteredConversations.map((conv) => {
                  const active = selectedConversation?.id === conv.id
                  return (
                    <motion.button
                      layout
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        "group relative w-full p-4 rounded-2xl border-2 transition-all duration-200 flex gap-4 text-left",
                        active 
                          ? "bg-[#B4F056]/20 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]" 
                          : "bg-white border-transparent hover:bg-gray-50 hover:border-black/10"
                      )}
                    >
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-2xl border-2 border-black overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] group-hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all bg-white">
                          {conv.other_party.avatar_url ? (
                            <AppImage src={conv.other_party.avatar_url} alt={conv.other_party.name} className="object-cover" sizes="56px" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#FFD93D] to-[#FF8C69] flex items-center justify-center font-black text-xl">
                              {conv.other_party.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {conv.unread_count > 0 && (
                          <div className="absolute -top-2 -right-2 bg-[#FF3D00] text-white border-2 border-black w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            {conv.unread_count}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className={cn("truncate font-black text-base", active ? "text-black" : "text-black/80")}>
                            {conv.other_party.name}
                          </h3>
                          <span className="text-[10px] font-black opacity-40 whitespace-nowrap uppercase">
                            {formatTime(conv.last_message_at || '')}
                          </span>
                        </div>
                        <p className={cn(
                          "text-sm truncate font-bold",
                          conv.unread_count > 0 ? "text-black" : "text-black/40"
                        )}>
                          {conv.last_message || 'Start a conversation...'}
                        </p>
                      </div>
                    </motion.button>
                  )
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Section - Chat Window */}
        <div className={cn(
          "flex-1 flex flex-col bg-white relative",
          selectedConversation ? "flex" : "hidden md:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b-[3px] border-black bg-[#F9F8F4]/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-4 min-w-0">
                  <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 rounded-xl border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="w-12 h-12 rounded-2xl border-2 border-black overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white shrink-0">
                    {selectedConversation.other_party.avatar_url ? (
                      <AppImage src={selectedConversation.other_party.avatar_url} alt={selectedConversation.other_party.name} className="object-cover" sizes="48px" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#B4F056] to-[#FFD93D] flex items-center justify-center font-black text-lg">
                        {selectedConversation.other_party.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-black text-lg truncate">{selectedConversation.other_party.name}</h2>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
                      <span className="text-[10px] font-black uppercase opacity-40">Active Now</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-opacity-5">
                <AnimatePresence initial={false}>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-30">
                      <MessageCircle className="w-12 h-12" />
                      <p className="font-black">Say hello to start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message, idx) => {
                      const isMine = message.sender_id === currentUserId
                      const prevSenderSame = idx > 0 && messages[idx - 1].sender_id === message.sender_id
                      
                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={cn(
                            "flex flex-col",
                            isMine ? "items-end" : "items-start",
                            prevSenderSame ? "mt-1" : "mt-6"
                          )}
                        >
                          <div className={cn(
                            "group relative max-w-[85%] sm:max-w-[70%] px-5 py-3 border-[2.5px] border-black transition-all",
                            isMine 
                              ? "bg-[#B4F056] rounded-[24px] rounded-br-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5" 
                              : "bg-white rounded-[24px] rounded-bl-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.01]"
                          )}>
                            <p className="text-[15px] font-bold leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                            
                            <div className="flex items-center justify-end gap-1.5 mt-1.5">
                              <span className="text-[9px] font-black opacity-30">
                                {formatTime(message.created_at)}
                              </span>
                              {isMine && (
                                message.read ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-[#3b82f6]" strokeWidth={3} />
                                ) : (
                                  <Check className="w-3.5 h-3.5 opacity-30" strokeWidth={3} />
                                )
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
                {peerTyping && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <TypingBubble peerName={selectedConversation.other_party.name} />
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-6 bg-white border-t-[3px] border-black">
                <form onSubmit={sendMessage} className="relative flex items-center gap-3">
                  <div className="flex-1 relative group">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value)
                        if (e.target.value.trim()) notifyTyping()
                      }}
                      placeholder="Type your message here..."
                      className="w-full pl-6 pr-14 py-4 bg-[#F9F8F4] border-[3px] border-black rounded-[22px] font-bold text-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] outline-none transition-all placeholder:text-black/20"
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="h-14 w-14 rounded-[22px] bg-[#B4F056] border-[3px] border-black flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[6px] active:translate-y-[6px] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
                  >
                    {sending ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <Send className="w-6 h-6" strokeWidth={3} />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F9F8F4]/20">
              <div className="w-32 h-32 rounded-3xl border-[3px] border-black bg-white flex items-center justify-center shadow-[10px_10px_0px_0px_rgba(180,240,86,1)] mb-8 animate-bounce-slow">
                <InboxIcon className="w-16 h-16" />
              </div>
              <h2 className="text-3xl font-black text-black mb-4">Messages</h2>
              <p className="text-black/50 font-bold max-w-sm mb-8">
                Connect with influencers effortlessly. Choose a conversation to start chatting!
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default function BrandInboxPage() {
  return (
    <Suspense fallback={
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-black" />
      </div>
    }>
      <BrandInboxInner />
    </Suspense>
  )
}
