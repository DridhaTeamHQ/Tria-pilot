import Link from 'next/link'

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-cream">
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <Link href="/" className="text-3xl font-serif font-bold text-charcoal">
          Kiwikoo
        </Link>
        <h1 className="text-5xl font-serif font-bold text-charcoal mt-6">Contact us</h1>
        <p className="mt-4 text-charcoal/70">
          Need help with onboarding, approval, or account issues? Reach out and our team will respond.
        </p>

        <div className="mt-10 bg-white rounded-3xl border border-charcoal/10 p-8">
          <p className="text-charcoal/70">
            Email: <span className="font-medium text-charcoal">team@dridhatechnologies.com</span>
          </p>
          <p className="text-charcoal/50 mt-2">
            For fastest support, include your account email and a short description of the issue.
          </p>
        </div>

        <div className="mt-10">
          <Link href="/login" className="text-charcoal font-medium hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  )
}

