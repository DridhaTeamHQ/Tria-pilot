import { Skeleton } from "@/components/ui/skeleton"

export function InfluencerDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#F9F8F4] pt-20 sm:pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 z-10">
        {/* Welcome Section */}
        <div className="mb-10 sm:mb-12 border-b-[3px] border-black pb-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="w-full text-center md:text-left space-y-3">
              <Skeleton className="h-12 sm:h-16 w-3/4 md:w-1/2 rounded-lg bg-gray-200" />
              <Skeleton className="h-6 w-1/2 md:w-1/3 rounded-lg bg-gray-200" />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 sm:mb-16">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl p-6 sm:p-8 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              <Skeleton className="w-12 h-12 rounded-lg mb-6 bg-gray-200" />
              <Skeleton className="h-10 sm:h-12 w-16 mb-2 rounded-lg bg-gray-200" />
              <Skeleton className="h-4 w-24 rounded-lg bg-gray-200" />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="hidden sm:block mb-8 sm:mb-12">
          <Skeleton className="h-8 w-48 mb-6 rounded-lg bg-gray-200" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl p-5 sm:p-6 border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-full"
              >
                <Skeleton className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg mb-3 bg-gray-200" />
                <Skeleton className="h-5 w-3/4 mb-2 rounded-lg bg-gray-200" />
                <Skeleton className="h-4 w-full rounded-lg bg-gray-200" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent Generations */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
            <Skeleton className="h-8 w-64 rounded-lg bg-gray-200" />
            <Skeleton className="h-6 w-32 rounded-lg bg-gray-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl overflow-hidden border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col"
              >
                <Skeleton className="aspect-[3/4] rounded-none bg-gray-200" />
                <div className="p-4 sm:p-5 flex items-center justify-between bg-white border-t-[3px] border-black">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-16 rounded-lg bg-gray-200" />
                    <Skeleton className="h-4 w-24 rounded-lg bg-gray-200" />
                  </div>
                  <Skeleton className="w-3 h-3 rounded-none bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function BrandDashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8">
      {/* Welcome Header */}
      <div className="mb-6 sm:mb-8 space-y-3">
        <Skeleton className="h-10 sm:h-12 w-3/4 md:w-1/2 rounded-lg bg-gray-200" />
        <Skeleton className="h-6 w-1/2 md:w-1/3 rounded-lg bg-gray-200" />
      </div>

      {/* Checklist Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-40 w-full rounded-xl border-[3px] border-black bg-white" />
      </div>

      {/* Widget Skeleton */}
      <div className="mb-6">
        <Skeleton className="h-64 w-full rounded-xl border-[3px] border-black bg-white" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8 sm:mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border-[3px] border-black p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-24 bg-gray-200" />
              <Skeleton className="h-3 w-16 bg-gray-200" />
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mb-8 flex gap-3 sm:mb-10">
        <Skeleton className="h-12 w-40 rounded-lg bg-gray-200" />
        <Skeleton className="h-12 w-40 rounded-lg bg-gray-200" />
      </div>

      {/* Table Section */}
      <div className="mb-8 sm:mb-10">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-48 bg-gray-200" />
          <Skeleton className="h-4 w-16 bg-gray-200" />
        </div>
        <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl overflow-hidden">
          <div className="p-4 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <Skeleton className="h-5 w-1/3 bg-gray-200" />
                <Skeleton className="h-5 w-20 bg-gray-200" />
                <Skeleton className="h-5 w-24 bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <Skeleton className="h-8 w-48 mb-6 bg-gray-200" />
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white border-[3px] border-black p-5 sm:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Skeleton className="w-14 h-14 rounded-lg mb-4 bg-gray-200" />
            <Skeleton className="h-6 w-3/4 mb-2 bg-gray-200" />
            <Skeleton className="h-4 w-full mb-4 bg-gray-200" />
            <Skeleton className="h-4 w-1/2 bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function MarketplaceSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FDF6EC] via-[#FDF6EC] to-white pb-16 pt-24 sm:pt-28">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header Skeleton */}
        <div className="mb-8 sm:mb-10">
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] items-stretch gap-3 sm:gap-4 xl:gap-5">
            {/* Left: Discovery Box */}
            <div className="relative h-full overflow-hidden rounded-[24px] border-[3px] border-black bg-white p-4 sm:p-6 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sm:rounded-[28px] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
              <Skeleton className="h-5 w-40 bg-gray-200 mb-4" />
              <Skeleton className="h-16 w-64 bg-gray-200 mb-4" />
              <Skeleton className="h-5 w-full max-w-xl bg-gray-200" />
            </div>

            {/* Right: Campaign Box */}
            <div className="min-h-[212px] sm:min-h-[260px] rounded-[22px] sm:rounded-[26px] border-[3px] border-black bg-white p-4 sm:p-5 shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] sm:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] xl:h-full">
              <div className="h-full flex flex-col justify-between">
                <div>
                  <Skeleton className="h-6 w-32 bg-gray-200 mb-4 rounded-full" />
                  <Skeleton className="h-10 w-3/4 bg-gray-200 mb-4" />
                </div>
                <Skeleton className="h-20 w-full bg-gray-100 rounded-[18px]" />
              </div>
            </div>
          </div>

          {/* Mobile Filter Button */}
          <Skeleton className="h-10 w-40 bg-gray-200 rounded-xl mb-4 sm:hidden border-[3px] border-black/10" />

          {/* Desktop Filter Pills */}
          <div className="hidden sm:flex items-center gap-3 mb-2">
            <Skeleton className="h-4 w-32 bg-gray-200" />
          </div>
          <div className="hidden sm:flex flex-wrap gap-2 mb-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[44px] w-[100px] bg-gray-200 rounded-full border-[3px] border-black/10" />
            ))}
          </div>

          {/* Search bar */}
          <div className="mt-4 flex flex-row gap-2 sm:gap-3 items-stretch">
            <Skeleton className="h-[52px] w-full bg-gray-200 rounded-xl border-[3px] border-black/10" />
            <Skeleton className="h-[52px] w-[120px] bg-gray-200 rounded-xl border-[3px] border-black/10 shrink-0" />
          </div>
        </div>

        {/* Product Count */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Skeleton className="h-[36px] w-[140px] bg-gray-200 rounded-full border-[2px] border-black/10" />
        </div>

        {/* Product Grid Skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
            <div key={i} className="overflow-hidden rounded-[24px] border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <Skeleton className="aspect-[4/5] sm:aspect-[3/4] rounded-none bg-gray-200" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-3/4 bg-gray-200" />
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-1/3 bg-gray-100" />
                  <Skeleton className="h-5 w-16 bg-gray-200" />
                </div>
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Skeleton className="h-3 w-20 bg-gray-50" />
                  <Skeleton className="h-10 w-24 bg-gray-200 rounded-xl" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="relative min-h-screen bg-[#FAFAF8]">
      {/* Aesthetic background (matching the page) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#FFD93D]/15 blur-3xl" />
        <div className="absolute top-1/2 -right-16 h-56 w-56 rounded-full bg-[#A78BFA]/12 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-48 w-48 rounded-full bg-[#B4F056]/12 blur-3xl" />
      </div>

      <div className="relative z-10 w-full pt-[100px] px-4 sm:px-6 lg:px-8 pb-8 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,45%)_minmax(0,55%)] lg:gap-12">
          
          {/* LEFT: Image Gallery */}
          <div className="w-full">
            <div className="overflow-hidden rounded-2xl border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] lg:sticky lg:top-[96px]">
              <Skeleton className="w-full aspect-[3/4] bg-gray-200 rounded-xl" />
            </div>
          </div>

          {/* RIGHT: Product Info */}
          <div className="flex flex-col space-y-6 lg:py-4">
            
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-16 bg-gray-200 rounded-lg" />
              <Skeleton className="h-6 w-20 bg-gray-200 rounded-md" />
              <Skeleton className="h-6 w-24 bg-gray-200 rounded-md" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-full bg-gray-200" />
              <Skeleton className="h-8 w-3/4 bg-gray-200" />
            </div>

            {/* Price */}
            <div>
              <Skeleton className="h-11 w-24 bg-gray-200 rounded-xl" />
            </div>

            {/* CTA Buttons */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
              <Skeleton className="h-[52px] w-full rounded-xl bg-gray-200 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
              <Skeleton className="h-[52px] w-full rounded-xl bg-gray-200 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
            </div>

            {/* Affiliate Link */}
            <div className="pt-2">
              <Skeleton className="h-[68px] w-full rounded-xl bg-gray-200 border-2 border-black" />
            </div>

            <hr className="border-2 border-black/10" />

            {/* Actions Row */}
            <div className="flex items-center gap-3 sm:gap-4 py-2 w-full">
              <Skeleton className="h-[42px] flex-1 rounded-none bg-gray-200 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
              <Skeleton className="h-[42px] flex-1 rounded-none bg-gray-200 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
              <Skeleton className="h-[42px] flex-1 rounded-none bg-gray-200 border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]" />
            </div>

            <hr className="border-2 border-black/10" />

            {/* Bottom Details Grid */}
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 pt-2 sm:grid-cols-2">
              <div>
                <Skeleton className="h-3 w-20 mb-2 bg-gray-200" />
                <Skeleton className="h-5 w-32 mb-2 bg-gray-200" />
                <div className="space-y-1.5 mt-2">
                  <Skeleton className="h-4 w-full bg-gray-200" />
                  <Skeleton className="h-4 w-full bg-gray-200" />
                  <Skeleton className="h-4 w-3/4 bg-gray-200" />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Skeleton className="h-3 w-24 mb-1 bg-gray-200" />
                  <Skeleton className="h-5 w-32 bg-gray-200" />
                </div>
                <div>
                  <Skeleton className="h-3 w-16 mb-1 bg-gray-200" />
                  <Skeleton className="h-5 w-24 bg-gray-200" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export function CampaignsSkeleton() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] pt-2 md:pt-3 pb-10 md:pb-12">
      <div className="container mx-auto px-4 max-w-full lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6 mb-10">
          <div className="space-y-4">
            <Skeleton className="h-12 w-64 bg-gray-200" />
            <Skeleton className="h-5 w-96 bg-gray-200" />
          </div>
          <Skeleton className="h-14 w-56 border-[3px] border-black bg-[#B4F056]/30 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]" />
        </div>

        {/* Analytics Section Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border-[3px] border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] rounded-2xl">
              <Skeleton className="h-4 w-24 mb-3 bg-gray-200" />
              <Skeleton className="h-8 w-32 bg-gray-200" />
            </div>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="bg-white border-[3px] border-black rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <Skeleton className="h-12 flex-1 bg-gray-200 rounded-xl" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-20 bg-gray-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        {/* Campaign Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="bg-white border-[3px] border-black rounded-[24px] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] h-[350px] p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-6 w-3/4 bg-gray-200" />
                  <Skeleton className="h-5 w-16 bg-gray-200 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-20 bg-gray-200 rounded-md" />
                <Skeleton className="h-16 w-full bg-gray-200" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16 bg-gray-200 rounded-lg" />
                  <Skeleton className="h-6 w-16 bg-gray-200 rounded-lg" />
                </div>
              </div>
              <div className="pt-4 border-t-2 border-black/10">
                <Skeleton className="h-12 w-full bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CollaborationsSkeleton() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] pt-28 pb-20">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Header */}
        <div className="mb-12 space-y-4">
          <Skeleton className="h-16 w-3/4 bg-gray-200" />
          <Skeleton className="h-6 w-1/2 bg-gray-200" />
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-4 mb-10">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-32 border-2 border-black bg-gray-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
          ))}
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 h-[300px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-8 w-1/2 bg-gray-200" />
                    <Skeleton className="h-4 w-1/3 bg-gray-200" />
                  </div>
                  <Skeleton className="h-8 w-20 bg-gray-200 border-2 border-black" />
                </div>
                <Skeleton className="h-16 w-full bg-gray-100 border-l-2 border-black" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-12 flex-1 bg-gray-200 border-2 border-black" />
                <Skeleton className="h-12 flex-1 bg-gray-200 border-2 border-black" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
