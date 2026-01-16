'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, CheckCircle2, Clock, MessageSquare, Bell, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useUser,
} from '@/lib/react-query/hooks'

function formatDistanceToNow(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
  return `${Math.floor(diffInSeconds / 604800)} weeks ago`
}

export default function InboxPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const { data, isLoading: loading } = useNotifications()
  const { data: user } = useUser()
  const markAsReadMutation = useMarkNotificationRead()
  const markAllAsReadMutation = useMarkAllNotificationsRead()

  const notifications = useMemo(() => data?.notifications || [], [data?.notifications])
  const unreadCount = useMemo(() => data?.unreadCount || 0, [data?.unreadCount])

  const handleNotificationClick = async (notification: any) => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await markAsReadMutation.mutateAsync(notification.id)
      } catch (error) {
        console.error('Failed to mark as read:', error)
      }
    }

    // Navigate based on notification type
    if (notification.type === 'collab_request' || notification.type === 'collab_accepted' || notification.type === 'collab_declined') {
      // Navigate to collaborations page based on user role
      if (user?.role === 'BRAND') {
        router.push('/brand/collaborations')
      } else if (user?.role === 'INFLUENCER') {
        router.push('/influencer/collaborations')
      } else {
        // Fallback - try to determine from pathname or default
        router.push('/brand/collaborations')
      }
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await markAsReadMutation.mutateAsync(id)
      toast.success('Marked as read!')
    } catch (error) {
      toast.error('Failed to mark as read')
    }
  }

  const markAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync()
      toast.success('All notifications marked as read!')
    } catch (error) {
      toast.error('Failed to mark all as read')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'collab_request':
        return <MessageSquare className="h-5 w-5 text-blue-500" />
      case 'collab_accepted':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'collab_declined':
        return <Clock className="h-5 w-5 text-orange-500" />
      default:
        return <Bell className="h-5 w-5 text-charcoal/50" />
    }
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n: any) => {
      if (filter === 'unread') return !n.isRead
      if (filter === 'read') return n.isRead
      return true
    })
  }, [notifications, filter])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream pt-24 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="w-8 h-8 text-charcoal/30" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream pt-24">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-serif text-charcoal mb-1 sm:mb-2">
              <span className="italic">Inbox</span>
            </h1>
            <p className="text-charcoal/60 text-sm sm:text-base">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="self-start sm:self-auto px-4 py-2 border border-charcoal/20 text-charcoal rounded-full flex items-center gap-2 hover:bg-charcoal/5 transition-colors text-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden sm:inline">Mark All</span> Read
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 sm:mb-8">
          {[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'read', label: 'Read', count: notifications.length - unreadCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all ${filter === tab.id
                ? 'bg-charcoal text-cream'
                : 'bg-white border border-subtle text-charcoal/70 hover:border-charcoal/30'
                }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <AnimatePresence mode="wait">
          {filteredNotifications.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-2xl border border-subtle p-16 text-center"
            >
              <Mail className="w-16 h-16 text-charcoal/20 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-charcoal mb-2">No notifications</h3>
              <p className="text-charcoal/60">
                {filter === 'unread'
                  ? "You're all caught up! No unread notifications."
                  : 'No notifications found.'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {filteredNotifications.map((notification: any, index: number) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleNotificationClick(notification)}
                  className={`bg-white rounded-2xl border p-5 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] ${!notification.isRead
                    ? 'border-l-4 border-l-peach border-t-subtle border-r-subtle border-b-subtle bg-peach/5'
                    : 'border-subtle'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-0.5 p-2 bg-cream rounded-xl">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-charcoal">{notification.content}</p>
                          <p className="text-sm text-charcoal/50 mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt))}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <span className="px-3 py-1 bg-peach text-charcoal text-xs font-medium rounded-full">
                            New
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
