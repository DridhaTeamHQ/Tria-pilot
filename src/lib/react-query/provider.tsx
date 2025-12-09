'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: data is considered fresh for 60 seconds (increased for better caching)
            staleTime: 60 * 1000,
            // Cache time: data stays in cache for 10 minutes (increased)
            gcTime: 10 * 60 * 1000,
            // Retry failed requests once
            retry: 1,
            // Don't refetch on window focus (reduces unnecessary calls)
            refetchOnWindowFocus: false,
            // Refetch on reconnect (important for offline/online transitions)
            refetchOnReconnect: true,
            // Don't refetch on mount if data is fresh (reduces API calls)
            refetchOnMount: false,
            // Network mode: prefer cache first
            networkMode: 'online',
            // Enable structural sharing for better performance
            structuralSharing: true,
          },
          mutations: {
            // Retry mutations once
            retry: 1,
            // Network mode
            networkMode: 'online',
          },
        },
      })
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

