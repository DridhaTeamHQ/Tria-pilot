import { Users, Search, SlidersHorizontal, ChevronDown, Award, ExternalLink, MessageCircle, Bookmark } from 'lucide-react'

export default function Loading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header Skeleton */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#B4F056]/20 rounded-[20px] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
          <div className="space-y-2">
            <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-48 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="h-11 w-32 bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
      </div>

      {/* Search & Filters Skeleton */}
      <div className="mb-10">
        <div className="bg-white border-[3px] border-black rounded-[32px] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          {/* Search bar skeleton */}
          <div className="p-4 sm:p-6 border-b-2 border-black bg-gray-50/50">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full h-[60px] bg-white border-2 border-black rounded-2xl animate-pulse" />
              <div className="w-full sm:w-40 h-[60px] bg-black/80 rounded-2xl animate-pulse" />
            </div>
          </div>

          {/* Filters Row skeleton */}
          <div className="p-4 sm:p-6 flex flex-wrap items-center gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 w-28 bg-white border-2 border-black rounded-xl animate-pulse" />
            ))}
            <div className="sm:ml-auto h-12 w-36 bg-white border-2 border-black rounded-xl animate-pulse" />
          </div>
        </div>
      </div>

      {/* Results Grid Skeleton */}
      <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white rounded-[32px] border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
          >
            <div className="p-6">
              <div className="flex items-start gap-5 mb-6">
                <div className="w-24 h-24 rounded-[24px] bg-gray-100 animate-pulse border-2 border-black" />
                <div className="flex-1 space-y-3 pt-2">
                  <div className="h-7 bg-gray-200 rounded-lg w-3/4 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded-lg w-1/2 animate-pulse" />
                  <div className="flex gap-2 mt-3">
                    <div className="h-6 bg-gray-100 rounded-md w-16 animate-pulse" />
                    <div className="h-6 bg-gray-100 rounded-md w-16 animate-pulse" />
                  </div>
                </div>
              </div>
              <div className="h-16 bg-gray-50 rounded-2xl mb-6 animate-pulse border-2 border-black/5" />
              <div className="flex gap-4">
                <div className="flex-1 h-12 bg-gray-100 rounded-xl animate-pulse border-2 border-black/5" />
                <div className="flex-1 h-12 bg-gray-100 rounded-xl animate-pulse border-2 border-black/5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
