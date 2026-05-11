export default function Loading() {
  return (
    <div className="relative min-h-screen bg-[#FFF8E6] pt-4 md:pt-5 pb-14 md:pb-16">
      <div className="relative z-10 w-full mx-auto space-y-6 px-4 lg:px-8 md:space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="h-10 sm:h-12 w-64 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-4 w-96 bg-gray-100 rounded-lg animate-pulse" />
          </div>
          <div className="h-12 w-40 bg-white border-[3px] border-black rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[1fr_420px] lg:gap-6">
          <div className="space-y-6">
            {/* Step 1: Style Selection Skeleton */}
            <div className="bg-white border-[3px] border-black rounded-2xl p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-black rounded-sm animate-pulse" />
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-32 w-full bg-gray-50 border-[3px] border-black rounded-xl animate-pulse" />
            </div>

            {/* Step 2: Assets Skeleton */}
            <div className="bg-white border-[3px] border-black rounded-2xl p-4 md:p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-black rounded-sm animate-pulse" />
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="aspect-[4/3] bg-gray-50 border-[3px] border-black rounded-xl animate-pulse" />
                <div className="aspect-[4/3] bg-gray-50 border-[3px] border-black rounded-xl animate-pulse" />
              </div>
            </div>

            {/* Typography Skeleton */}
            <div className="h-16 w-full bg-[#B4F056] border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse" />

            {/* Configuration Skeleton */}
            <div className="h-16 w-full bg-[#FFD93D] border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
          </div>

          {/* Right Sidebar: Preview Skeleton */}
          <div className="sticky top-24 space-y-6">
             <div className="aspect-square w-full bg-white border-[4px] border-black rounded-[32px] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-pulse" />
             <div className="h-16 w-full bg-black rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}
