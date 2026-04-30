import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'
import { extractClickMetadata } from '@/lib/links/tracker'
import { sanitizeRedirectUrl } from '@/lib/links/utils'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const { linkCode } = await params
    const service = createServiceClient()

    const { data: trackedLink, error } = await service
      .from('tracked_links')
      .select('id, original_url, is_active')
      .eq('link_code', linkCode)
      .single()

    if (error || !trackedLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    if (!trackedLink.is_active) {
      return NextResponse.json({ error: 'Link is inactive' }, { status: 410 })
    }

    const clickMetadata = await extractClickMetadata(request)

    const { error: recordError } = await service.from('link_clicks').insert({
      tracked_link_id: trackedLink.id,
      ip_address: clickMetadata.ipAddress,
      user_agent: clickMetadata.userAgent,
      referrer: clickMetadata.referrer,
      device_type: clickMetadata.deviceType,
      country: clickMetadata.country,
    })

    if (recordError) {
      console.warn('Failed to persist link click metadata:', recordError)
    }

    let countError: unknown = null
    if (!recordError) {
      const { count, error: countQueryError } = await service
        .from('link_clicks')
        .select('id', { count: 'exact', head: true })
        .eq('tracked_link_id', trackedLink.id)

      if (countQueryError) {
        countError = countQueryError
      } else {
        const { error: syncError } = await service
          .from('tracked_links')
          .update({
            click_count: count ?? 0,
          })
          .eq('id', trackedLink.id)

        countError = syncError || null
      }
    }

    if (countError) {
      console.warn('Failed to sync tracked link click count:', countError)
    }

    const redirectUrl = sanitizeRedirectUrl(trackedLink.original_url)
    if (!redirectUrl) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 500 })
    }

    const response = NextResponse.redirect(redirectUrl, { status: 301 })

    // Set a persistent cookie (30 days) to track this click for later attribution
    response.cookies.set('tria_affiliate_code', linkCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })

    return response
  } catch (error) {
    console.error('Link redirect error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
