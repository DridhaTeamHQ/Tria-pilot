'use client'

import { Heart } from 'lucide-react'
import { toast } from '@/lib/simple-sonner'
import { useFavorites, useToggleFavorite } from '@/lib/react-query/hooks'

interface FavoriteButtonProps {
  productId: string
}

export default function FavoriteButton({ productId }: FavoriteButtonProps) {
  const { data: favorites = [], isLoading } = useFavorites()
  const toggleMutation = useToggleFavorite()

  // Check if product is favorited (favorites is an array of products)
  const isFavorited = favorites.some((product: any) => product?.id === productId || product?.product_id === productId)

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

  const buttonLabel = toggleMutation.isPending
    ? 'Saving...'
    : isLoading
      ? 'Checking...'
      : isFavorited
        ? 'Saved'
        : 'Save'

  const buttonTone = isFavorited
    ? 'bg-red-500 text-white'
    : isLoading
      ? 'bg-[#FFF4D9] text-black/60'
      : 'bg-white text-black'

  return (
    <button type="button"
      className={`flex min-h-[42px] w-full items-center justify-center gap-2 border-[3px] border-black px-3 py-2 text-xs font-bold uppercase tracking-wider shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all rounded-lg ${buttonTone} ${isLoading ? 'cursor-wait' : 'hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]'}`}
      onClick={handleToggle}
      disabled={toggleMutation.isPending || isLoading}
      aria-busy={toggleMutation.isPending || isLoading}
    >
      <Heart
        className={`h-5 w-5 sm:h-4 sm:w-4 shrink-0 ${isFavorited ? 'fill-current' : ''
          }`}
      />
      <span className="hidden sm:inline truncate">{buttonLabel}</span>
    </button>
  )
}
