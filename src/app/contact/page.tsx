 'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    userType: 'Influencer',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send message')
      toast.success('Message sent! We will respond shortly.')
      setForm({ name: '', email: '', subject: '', message: '', userType: 'Influencer' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

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

        <div className="mt-10 grid gap-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-charcoal/10 p-8 space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-charcoal">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-charcoal">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-charcoal">Subject</label>
                <input
                  required
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-charcoal">User type</label>
                <select
                  value={form.userType}
                  onChange={(e) => setForm({ ...form, userType: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
                >
                  <option>Influencer</option>
                  <option>Brand</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-charcoal">Message</label>
              <textarea
                required
                rows={6}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-subtle bg-white text-charcoal focus:outline-none focus:ring-2 focus:ring-peach/50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center px-7 py-3 rounded-full bg-charcoal text-cream font-medium hover:bg-charcoal/90 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send message'}
            </button>
          </form>

          <div className="bg-white rounded-3xl border border-charcoal/10 p-6 text-charcoal/70">
            Email: <span className="font-medium text-charcoal">team@dridhatechnologies.com</span>
            <p className="text-charcoal/50 mt-2">
              For fastest support, include your account email and a short description of the issue.
            </p>
          </div>

          <div>
            <Link href="/login" className="text-charcoal font-medium hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

