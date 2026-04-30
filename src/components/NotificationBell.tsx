'use client'

/**
 * NOTIFICATION BELL
 *
 * Reusable header notification icon with unread badge + dropdown of recent
 * notifications. Pulls from /api/notifications, polls every 60s, marks
 * individual entries read on click + deep-links to the relevant page.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Inbox, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/auth-client'

interface NotificationItem {
  id: string
  type: string
  content: string
  read: boolean
  isRead?: boolean
  metadata?: Record<string, unknown> | null
  created_at: string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function deepLinkFor(n: NotificationItem, role: 'brand' | 'influencer' | null): string | null {
  const meta = (n.metadata || {}) as Record<string, unknown>
  const requestId = typeof meta.requestId === 'string' ? meta.requestId : null
  const campaignId = typeof meta.campaignId === 'string' ? meta.campaignId : null
  const threadId = typeof meta.threadId === 'string' ? meta.threadId : null

  switch (n.type) {
    case 'collab_request':
    case 'collab_accepted':
    case 'collab_declined':
      if (role === 'brand') return '/brand/collaborations'
      if (role === 'influencer') return '/influencer/collaborations'
      return '/inbox'
    case 'campaign_invite':
      if (role === 'influencer') return '/influencer/collaborations'
      if (campaignId && role === 'brand') return `/brand/campaigns/${campaignId}`
      return '/influencer/collaborations'
    case 'message':
      if (role === 'brand') return threadId ? `/brand/inbox?thread=${threadId}` : '/brand/inbox'
      return threadId ? `/inbox?thread=${threadId}` : '/inbox'
    default:
      if (requestId && role === 'brand') return '/brand/collaborations'
      if (requestId && role === 'influencer') return '/influencer/collaborations'
      return null
  }
}

export default function NotificationBell({
  role,
  variant = 'brand',
}: {
  role: 'brand' | 'influencer' | null
  variant?: 'brand' | 'influencer'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      const list: NotificationItem[] = (data.notifications || []).map((n: any) => ({
        ...n,
        read: n.read ?? n.isRead ?? false,
      }))
      setItems(list)
      setUnread(typeof data.unreadCount === 'number' ? data.unreadCount : list.filter((n) => !n.read).length)
    } catch {
      // silent — notifications shouldn't break the UI
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial + 10s polling fallback (only while the tab is visible).
  // Realtime is the primary source — this just guarantees delivery if the
  // Supabase Realtime publication isn't enabled on the notifications table.
  useEffect(() => {
    fetchNotifications()
    let id: ReturnType<typeof setInterval> | null = null
    const start = () => {
      if (id) return
      id = setInterval(() => {
        if (!document.hidden) fetchNotifications()
      }, 10_000)
    }
    const stop = () => {
      if (id) {
        clearInterval(id)
        id = null
      }
    }
    start()
    const onVis = () => {
      if (document.hidden) {
        stop()
      } else {
        fetchNotifications()
        start()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [fetchNotifications])

  // Live updates via Supabase Realtime — refresh the moment a notification
  // row gets inserted for the current user. Falls back gracefully if we
  // can't determine the user id.
  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false
    let channel: ReturnType<ReturnType<typeof createClient>['channel']> | null = null
    const supabase = createClient()

    const subscribe = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const uid = data?.user?.id
        if (!uid || cancelled) return

        channel = supabase
          .channel(`notif-bell-${uid}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'notifications',
              filter: `user_id=eq.${uid}`,
            },
            () => {
              if (!cancelled) fetchNotifications()
            },
          )
          .subscribe()
      } catch {
        // Silent — bell still polls every 60s
      }
    }

    subscribe()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchNotifications])

  // Refetch when dropdown opens to avoid stale reads
  useEffect(() => {
    if (open) fetchNotifications()
  }, [open, fetchNotifications])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleClick = async (n: NotificationItem) => {
    setOpen(false)
    // Optimistic: mark read locally
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnread((u) => Math.max(0, u - 1))
      fetch(`/api/notifications/${n.id}/read`, { method: 'POST', credentials: 'include' }).catch(() => {})
    }
    const link = deepLinkFor(n, role)
    if (link) router.push(link)
  }

  const handleMarkAllRead = async () => {
    if (unread === 0) return
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
    try {
      await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' })
    } catch {
      // ignore
    }
  }

  const isBrand = variant === 'brand'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          isBrand
            ? 'relative w-9 h-9 rounded-xl bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center transition-transform hover:-translate-y-0.5'
            : 'relative w-10 h-10 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-gray-50'
        }
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-black" strokeWidth={2.5} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[min(360px,calc(100vw-2rem))] bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden z-50 animate-fadeIn">
          <div className="px-4 py-3 border-b-2 border-black flex items-center justify-between bg-[#F9F8F4]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" strokeWidth={3} />
              <h3 className="text-xs font-black uppercase tracking-wider">Notifications</h3>
              {unread > 0 && (
                <span className="text-[10px] font-black bg-[#B4F056] px-1.5 py-0.5 border border-black rounded">
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-bold text-black/70 hover:text-black"
              >
                <Check className="w-3 h-3" strokeWidth={3} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-black/30" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center px-6">
                <Inbox className="w-8 h-8 mx-auto mb-2 text-black/20" strokeWidth={2} />
                <p className="text-sm font-bold text-black/50">No notifications yet</p>
                <p className="text-[11px] text-black/30 mt-1">You&apos;re all caught up</p>
              </div>
            ) : (
              <ul>
                {items.slice(0, 30).map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[#F9F8F4] transition-colors border-b border-black/8 last:border-b-0 ${!n.read ? 'bg-[#B4F056]/8' : ''}`}
                    >
                      {!n.read && <span className="flex-shrink-0 mt-1.5 w-2 h-2 rounded-full bg-[#B4F056] border border-black" />}
                      {n.read && <span className="flex-shrink-0 mt-1.5 w-2 h-2" />}
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] leading-snug ${!n.read ? 'font-bold text-black' : 'font-medium text-black/70'}`}>
                          {n.content}
                        </p>
                        <p className="text-[10px] text-black/40 mt-0.5 font-semibold">{timeAgo(n.created_at)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
      `}</style>
    </div>
  )
}
