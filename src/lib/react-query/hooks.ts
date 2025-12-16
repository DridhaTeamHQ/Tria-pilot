'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// User data hook - optimized for auth-aware navigation
export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store', // Always fetch fresh data from server
      })
      if (!res.ok) {
        // If 401, user is not authenticated - return null instead of throwing
        if (res.status === 401) {
          return null
        }
        throw new Error('Failed to fetch user')
      }
      const data = await res.json()
      return data.user || null
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds (for navigation)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: false, // Don't retry on 401 errors
    refetchOnMount: true, // Always refetch on component mount to get fresh auth state
    refetchOnWindowFocus: true, // Refetch when window regains focus (user may have logged in)
    refetchOnReconnect: true, // Refetch when network reconnects
  })
}


// Notifications hook
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications', {
        cache: 'no-store',
        next: { revalidate: 10 }, // Revalidate every 10 seconds
      })
      if (!res.ok) throw new Error('Failed to fetch notifications')
      return res.json()
    },
    staleTime: 10 * 1000, // 10 seconds - notifications update frequently
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    refetchOnWindowFocus: true, // Refetch when window regains focus
  })
}

// Mark notification as read mutation
export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to mark as read')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// Mark all notifications as read mutation
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to mark all as read')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// Products hook with filters
export function useProducts(filters?: { brandId?: string; category?: string; search?: string }) {
  const params = new URLSearchParams()
  if (filters?.brandId) params.set('brandId', filters.brandId)
  if (filters?.category) params.set('category', filters.category)
  if (filters?.search) params.set('search', filters.search)

  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const res = await fetch(`/api/products?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      return data.data || data
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

// Single product hook
export function useProduct(productId: string | null) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) return null
      const res = await fetch(`/api/products?id=${productId}`)
      if (!res.ok) throw new Error('Failed to fetch product')
      return res.json()
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Product recommendations hook
export function useProductRecommendations(productId: string | null) {
  return useQuery({
    queryKey: ['product-recommendations', productId],
    queryFn: async () => {
      if (!productId) return []
      const res = await fetch(`/api/products/recommend?productId=${productId}`)
      if (!res.ok) return []
      return res.json()
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000, // 10 minutes - recommendations don't change often
  })
}

// Profile stats hook
export function useProfileStats() {
  return useQuery({
    queryKey: ['profile-stats'],
    queryFn: async () => {
      const res = await fetch('/api/profile/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Favorites hook
export function useFavorites() {
  return useQuery({
    queryKey: ['favorites'],
    queryFn: async () => {
      const res = await fetch('/api/favorites')
      if (!res.ok) throw new Error('Failed to fetch favorites')
      return res.json()
    },
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Toggle favorite mutation with optimistic updates
export function useToggleFavorite() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ productId, isFavorited }: { productId: string; isFavorited: boolean }) => {
      if (isFavorited) {
        const res = await fetch(`/api/favorites?productId=${productId}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error('Failed to remove favorite')
        return res.json()
      } else {
        const res = await fetch('/api/favorites', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        })
        if (!res.ok) throw new Error('Failed to add favorite')
        return res.json()
      }
    },
    onMutate: async ({ productId, isFavorited }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['favorites'] })

      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData(['favorites'])

      // Optimistically update UI immediately
      queryClient.setQueryData(['favorites'], (old: any[] = []) => {
        if (isFavorited) {
          // Remove from favorites
          return old.filter((product: any) => product.id !== productId)
        } else {
          // Add to favorites (we'll need the product data, but for now just mark as favorited)
          // The actual product will be added when the query refetches
          return old
        }
      })

      return { previousFavorites }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(['favorites'], context.previousFavorites)
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate to refetch and get accurate data
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })
}

// Generations hook - fetch all user's try-on generations
export function useGenerations() {
  return useQuery({
    queryKey: ['generations'],
    queryFn: async () => {
      const res = await fetch('/api/generations', {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!res.ok) {
        if (res.status === 401) return []
        throw new Error('Failed to fetch generations')
      }
      const data = await res.json()
      return data.generations || []
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  })
}

export function useDeleteGeneration() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/generations/${id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((data as any)?.error || 'Failed to delete generation')
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generations'] })
    },
  })
}
