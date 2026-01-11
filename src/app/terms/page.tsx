import Link from 'next/link'

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Link href="/" className="text-3xl font-serif font-bold text-charcoal">
          Kiwikoo
        </Link>
        <h1 className="text-5xl font-serif font-bold text-charcoal mt-6">Terms of Use</h1>
        <p className="mt-4 text-charcoal/70">
          This is a placeholder terms page for Kiwikoo. Replace this content with your finalized terms before launching.
        </p>

        <div className="mt-10 bg-white rounded-3xl border border-charcoal/10 p-8 space-y-4 text-charcoal/70">
          <p>
            <strong className="text-charcoal">Accounts</strong>: you’re responsible for maintaining the confidentiality
            of your login credentials.
          </p>
          <p>
            <strong className="text-charcoal">Acceptable use</strong>: do not abuse the platform or upload unlawful
            content.
          </p>
          <p>
            <strong className="text-charcoal">Availability</strong>: the service may change over time as we improve it.
          </p>
        </div>

        <div className="mt-10">
          <Link href="/contact" className="text-charcoal font-medium hover:underline">
            Contact support
          </Link>
        </div>
      </div>
    </main>
  )
}

