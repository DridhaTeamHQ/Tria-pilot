import { InfluencerDashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"

export default function Loading() {
  // Brand products page looks very similar to influencer dashboard recent creations but with a header.
  // We can reuse the InfluencerDashboardSkeleton or parts of it, but since I want a clean fix,
  // I'll create a specific one if needed, or just use the Influencer one as it has the grid.
  // Actually, let's just make it look right for the products page.
  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 animate-fade-in">
        <div className="w-full max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
            <div className="space-y-3">
                <div className="h-10 sm:h-12 w-48 animate-pulse bg-black/10" />
                <div className="h-5 w-64 animate-pulse bg-black/5" />
            </div>
            <div className="h-14 w-full sm:w-40 animate-pulse bg-[#B4F056]/30 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" />
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="overflow-hidden rounded-[28px] border-[3px] border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    <div className="aspect-[4/3] animate-pulse bg-[#EEE8DC]" />
                    <div className="space-y-4 p-4 sm:p-5">
                        <div className="space-y-2">
                            <div className="h-6 w-3/4 animate-pulse bg-black/10" />
                            <div className="h-4 w-1/2 animate-pulse bg-black/10" />
                            <div className="h-4 w-full animate-pulse bg-black/5" />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="h-11 flex-1 animate-pulse rounded-full bg-black/10" />
                            <div className="h-11 flex-1 animate-pulse rounded-full bg-black/5" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  )
}
