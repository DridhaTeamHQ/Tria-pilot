import Link from 'next/link'
import { createClient } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AboutPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoggedIn = Boolean(user)

  return (
    <main className="min-h-screen bg-cream">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28">
        <h1 className="text-4xl font-serif font-bold text-charcoal sm:text-5xl">About Kiwikoo</h1>
        <p className="mt-4 text-base leading-8 text-charcoal/70 sm:text-lg">
          Kiwikoo is an AI-powered fashion try-on discovery platform that connects creators and brands. We help influencers
          create high-quality try-ons, and help brands launch campaigns with measurable performance.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-charcoal/10 bg-white p-6 sm:p-7">
            <h2 className="text-xl font-semibold text-charcoal">For influencers</h2>
            <p className="text-charcoal/60 mt-2">
              Build a portfolio, create try-ons faster, and collaborate with brands.
            </p>
          </div>
          <div className="rounded-3xl border border-charcoal/10 bg-white p-6 sm:p-7">
            <h2 className="text-xl font-semibold text-charcoal">For brands</h2>
            <p className="text-charcoal/60 mt-2">
              Find creators, generate assets, and track performance in one place.
            </p>
          </div>
        </div>

        {!isLoggedIn && (
          <div className="mt-10">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-charcoal px-7 py-3 font-medium text-cream hover:bg-charcoal/90"
            >
              Create an account
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
