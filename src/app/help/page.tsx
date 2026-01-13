import Link from 'next/link'

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Link href="/" className="text-3xl font-serif font-bold text-charcoal">
          Kiwikoo
        </Link>

        <h1 className="text-5xl font-serif font-bold text-charcoal mt-6">Help & Support</h1>
        <p className="mt-4 text-charcoal/70">
          Quick answers for common issues. If you need help, contact our team and we’ll respond.
        </p>

        <div className="mt-10 grid gap-6">
          <div className="bg-white rounded-3xl border border-charcoal/10 p-8">
            <h2 className="text-xl font-semibold text-charcoal">I can’t access influencer features</h2>
            <p className="text-charcoal/60 mt-2">
              Influencer accounts require admin approval. You can check your status here:
              <span className="mx-1" />
              <Link href="/influencer/pending" className="text-charcoal font-medium hover:underline">
                /influencer/pending
              </Link>
              .
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-charcoal/10 p-8">
            <h2 className="text-xl font-semibold text-charcoal">I didn’t receive a confirmation email</h2>
            <p className="text-charcoal/60 mt-2">
              Check spam/junk folders. If you still don’t see it, try signing in—if your email isn’t confirmed, you’ll
              be prompted to verify.
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-charcoal/10 p-8">
            <h2 className="text-xl font-semibold text-charcoal">Contact support</h2>
            <p className="text-charcoal/60 mt-2">
              Email us at <span className="font-medium text-charcoal">team@dridhatechnologies.com</span>.
            </p>
            <div className="mt-5">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-charcoal text-cream font-medium hover:bg-charcoal/90"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

