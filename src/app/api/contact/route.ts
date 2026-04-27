import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/supabase-email'

const schema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().email(),
    subject: z.string().trim().min(3).max(200),
    message: z.string().trim().min(10).max(4000),
    userType: z.enum(['Influencer', 'Brand', 'Other']),
  })
  .strict()

/** Escape user input before interpolating into HTML. Prevents HTML/script
 *  injection landing in the support team's inbox. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ── Lightweight in-memory IP rate limiter ──────────────────────────────────
// Caps unauthenticated traffic to 5 messages per IP per hour. Adequate for
// a contact form; not a substitute for a proper distributed limiter at scale.
const ipBucket = new Map<string, { count: number; resetAt: number }>()
const LIMIT = parseInt(process.env.CONTACT_FORM_HOURLY_LIMIT || '5', 10) || 5
const WINDOW_MS = 60 * 60 * 1000

function checkIpLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipBucket.get(ip)
  if (!entry || now > entry.resetAt) {
    ipBucket.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= LIMIT) return false
  entry.count += 1
  return true
}

export async function POST(request: Request) {
  try {
    // ── Rate limit by IP ────────────────────────────────────────────────
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'
    if (!checkIpLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again in an hour.' },
        { status: 429, headers: { 'Retry-After': '3600' } }
      )
    }

    const body = await request.json().catch(() => null)
    const data = schema.parse(body)

    const supportEmail = process.env.SUPPORT_EMAIL || 'team@dridhatechnologies.com'
    const subject = `[Kiwikoo Support] ${escapeHtml(data.subject)}`

    // All user-supplied fields are HTML-escaped before interpolation.
    const safeName = escapeHtml(data.name)
    const safeEmail = escapeHtml(data.email)
    const safeUserType = escapeHtml(data.userType)
    const safeSubject = escapeHtml(data.subject)
    const safeMessage = escapeHtml(data.message).replace(/\n/g, '<br/>')

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h2>New support request</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmail}</p>
        <p><strong>User type:</strong> ${safeUserType}</p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong></p>
        <p>${safeMessage}</p>
      </div>
    `

    const text = `New support request\n\nName: ${data.name}\nEmail: ${data.email}\nUser type: ${data.userType}\nSubject: ${data.subject}\n\nMessage:\n${data.message}`

    await sendEmail({
      to: supportEmail,
      subject,
      html,
      text,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Contact form error:', error)
    // Don't leak internal error messages to clients.
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
