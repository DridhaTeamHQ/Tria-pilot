import 'server-only'

export interface SendEmailPayload {
  to: string
  subject: string
  html: string
  text?: string
}

export interface SendEmailResult {
  ok: boolean
  skipped?: boolean
  error?: string
}

export async function sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('RESEND_API_KEY not set, skipping email send')
    return { ok: false, skipped: true, error: 'RESEND_API_KEY missing' }
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Kiwikoo <no-reply@kiwikoo.com>'

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      console.warn('Failed to send email:', response.status, errorBody)
      return { ok: false, error: errorBody || `HTTP ${response.status}` }
    }

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('Email send error:', message)
    return { ok: false, error: message }
  }
}
