'use client'

import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useFavorites, useToggleFavorite } from '@/lib/react-query/hooks'

interface FavoriteButtonProps {
  productId: string
}

export default function FavoriteButton({ productId }: FavoriteButtonProps) {
  const { data: favorites = [], isLoading } = useFavorites()
  const toggleMutation = useToggleFavorite()

  // Check if product is favorited (favorites is an array of products)
  const isFavorited = favorites.some((product: any) => product.id === productId)

  const handleToggle = () => {
    // Immediate optimistic update - UI updates instantly
    toggleMutation.mutate(
      { productId, isFavorited },
      {
        onSuccess: () => {
          toast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites', {
            duration: 2000,
          })
        },
        onError: () => {
          toast.error('Failed to update favorites')
        },
      }
    )
  }

  return (
    <button
      className={`flex-1 py-3 px-6 border-[3px] border-black font-bold uppercase tracking-wider shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center gap-2 ${isFavorited ? 'bg-red-500 text-white' : 'bg-white text-black'
        }`}
      onClick={handleToggle}
      disabled={toggleMutation.isPending || isLoading}
    >
      <Heart
        className={`h-5 w-5 ${isFavorited ? 'fill-current' : ''
          }`}
      />
      {toggleMutation.isPending
        ? '...'
        : isFavorited
          ? 'SAVED'
          : 'SAVE'}
    </button>
  )
}

