import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/auth'
import { applyAmazonTrackingTag, normalizeAmazonTrackingId } from '@/lib/affiliate/amazon'
import { extractClickMetadata } from '@/lib/links/tracker'
import { sanitizeRedirectUrl } from '@/lib/links/utils'
import { ipRateLimit, getClientIp } from '@/lib/security/ip-rate-limit'
import { getPublicSiteUrlFromRequest, joinPublicUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ linkCode: string }> }
) {
  try {
    const { linkCode } = await params

    // SECURITY: rate-limit per IP. Without this, an attacker can sweep
    // link codes to enumerate the tracked_links table (each unknown code
    // returns a distinguishable 404). Also blocks click-fraud bots from
    // inflating creator click counts at machine speed. 60 redirects per
    // IP per minute is more than enough for any legitimate user.
    const ip = getClientIp(request)
    const rl = ipRateLimit(`link-redirect:${ip}`, 60, 60_000)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetMs / 1000)) } },
      )
    }

    // SECURITY: validate linkCode shape. Prevents weird path traversals
    // or PostgREST grammar surprises in the .eq() filter, and yields a
    // fast-path 404 for obvious garbage scans.
    if (!/^[A-Za-z0-9_-]{4,64}$/.test(linkCode)) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    const service = createServiceClient()

    const { data: trackedLink, error } = await service
      .from('tracked_links')
      .select('id, original_url, product_id, influencer_id, click_count, is_active')
      .eq('link_code', linkCode)
      .single()

    if (error || !trackedLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    if (!trackedLink.is_active) {
      return NextResponse.json({ error: 'Link is inactive' }, { status: 410 })
    }

    const clickMetadata = await extractClickMetadata(request)

    const recordPromise = service.from('link_clicks').insert({
      tracked_link_id: trackedLink.id,
      ip_address: clickMetadata.ipAddress,
      user_agent: clickMetadata.userAgent,
      referrer: clickMetadata.referrer,
      device_type: clickMetadata.deviceType,
      country: clickMetadata.country,
    })

    const countPromise = (async () => {
      try {
        const { error: rpcError } = await service.rpc('increment_click_count', { link_id: trackedLink.id })
        if (!rpcError) return null

        const { error: updateError } = await service
          .from('tracked_links')
          .update({ click_count: (trackedLink.click_count || 0) + 1 })
          .eq('id', trackedLink.id)

        return updateError || rpcError
      } catch (rpcError) {
        const { error: updateError } = await service
          .from('tracked_links')
          .update({ click_count: (trackedLink.click_count || 0) + 1 })
          .eq('id', trackedLink.id)

        return updateError || rpcError
      }
    })()

    const [{ error: recordError }, countError] = await Promise.all([recordPromise, countPromise])

    if (recordError) {
      console.warn('Failed to persist link click metadata:', recordError)
    }

    if (countError) {
      console.warn('increment_click_count RPC failed:', countError)
    }

    const publicSiteUrl = getPublicSiteUrlFromRequest(request)
    const fallbackUrl = publicSiteUrl

    let latestOriginalUrl = trackedLink.original_url
    let currentProductUrl: string | null = null
    if (trackedLink.product_id && trackedLink.influencer_id) {
      try {
        const [{ data: influencerProfile }, { data: product }] = await Promise.all([
          service
            .from('influencer_profiles')
            .select('*')
            .eq('user_id', trackedLink.influencer_id)
            .maybeSingle(),
          service
            .from('products')
            .select('link')
            .eq('id', trackedLink.product_id)
            .maybeSingle(),
        ])

        currentProductUrl =
          typeof product?.link === 'string' && product.link.trim().length > 0
            ? product.link.trim()
            : null
        const baseOriginalUrl =
          typeof product?.link === 'string' && product.link.trim().length > 0
            ? product.link.trim()
            : trackedLink.original_url
        const affiliateTag =
          normalizeAmazonTrackingId((influencerProfile as { affiliate_code?: unknown } | null)?.affiliate_code) ||
          normalizeAmazonTrackingId(process.env.AMAZON_DEFAULT_TRACKING_ID)
        const recomputedUrl = applyAmazonTrackingTag(baseOriginalUrl, affiliateTag)

        if (recomputedUrl && recomputedUrl !== trackedLink.original_url) {
          latestOriginalUrl = recomputedUrl
          const { error: syncError } = await service
            .from('tracked_links')
            .update({ original_url: recomputedUrl })
            .eq('id', trackedLink.id)

          if (syncError) {
            console.warn('Failed to sync tracked link redirect URL:', syncError)
          }
        }
      } catch (refreshError) {
        console.warn('Failed to refresh tracked link affiliate redirect:', refreshError)
      }
    }

    const redirectUrl =
      sanitizeRedirectUrl(latestOriginalUrl) ||
      sanitizeRedirectUrl(trackedLink.original_url) ||
      sanitizeRedirectUrl(currentProductUrl || '') ||
      fallbackUrl
    if (!redirectUrl) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 500 })
    }

    const response = NextResponse.redirect(redirectUrl, { status: 302 })
    response.headers.set('Cache-Control', 'no-store, max-age=0')

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
