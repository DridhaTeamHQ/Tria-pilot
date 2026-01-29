'use client'

import Link from 'next/link'
import ProductCard from '@/components/marketplace/ProductCard'
import { useProductRecommendations } from '@/lib/react-query/hooks'

interface ProductRecommendationsProps {
  productId: string
}

export default function ProductRecommendations({ productId }: ProductRecommendationsProps) {
  const { data: recommendations = [], isLoading: loading } = useProductRecommendations(productId)

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">You may also like</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-semibold mb-6">You may also like</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {recommendations.map((product: any, index: number) => (
          <ProductCard
            key={product.id}
            product={product}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}

