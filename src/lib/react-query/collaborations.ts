'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// Collaborations hook with caching
export function useCollaborations(type: 'sent' | 'received') {
  return useQuery({
    queryKey: ['collaborations', type],
    queryFn: async () => {
      const res = await fetch(`/api/collaborations?type=${type}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Failed to fetch collaborations')
      return res.json()
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus to reduce requests
  })
}

// Update collaboration status mutation with optimistic updates
export function useUpdateCollaborationStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'declined' }) => {
      const res = await fetch('/api/collaborations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error(`Failed to ${status} collaboration`)
      return res.json()
    },
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['collaborations'] })

      // Snapshot previous value
      const previousCollaborations = queryClient.getQueryData(['collaborations', 'received'])

      // Optimistically update
      queryClient.setQueryData(['collaborations', 'received'], (old: any[]) => {
        if (!old) return old
        return old.map((collab: any) =>
          collab.id === id ? { ...collab, status } : collab
        )
      })

      return { previousCollaborations }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCollaborations) {
        queryClient.setQueryData(['collaborations', 'received'], context.previousCollaborations)
      }
      toast.error(`Failed to ${variables.status} collaboration`)
    },
    onSuccess: (data, variables) => {
      toast.success(`Collaboration ${variables.status} successfully! 🎉`, {
        duration: 3000,
        position: 'top-center',
      })
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['collaborations'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

