import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/auth'
import {
  applyAmazonTrackingTag,
  getAmazonStoreIdFromTrackingId,
  normalizeAmazonStoreId,
  normalizeAmazonTrackingId,
} from '@/lib/affiliate/amazon'
import { generateLinkCode } from '@/lib/links/generator'
import { getMaskedUrl } from '@/lib/links/utils'
import { getPublicSiteUrlFromRequest, joinPublicUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

function appendVisibleAttributionParams(
  maskedUrl: string,
  options: { storeId: string | null; amazonTrackId: string | null; linkCode: string },
) {
  try {
    const url = new URL(maskedUrl)
    if (options.storeId) url.searchParams.set('storeId', options.storeId)
    if (options.amazonTrackId) url.searchParams.set('trackId', options.amazonTrackId)
    url.searchParams.set('linkCode', options.linkCode)
    return url.toString()
  } catch {
    const params = new URLSearchParams()
    if (options.storeId) params.set('storeId', options.storeId)
    if (options.amazonTrackId) params.set('trackId', options.amazonTrackId)
    params.set('linkCode', options.linkCode)
    return `${maskedUrl}${maskedUrl.includes('?') ? '&' : '?'}${params.toString()}`
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productId } = await params
    if (!productId) {
      return NextResponse.json({ error: 'Product ID required' }, { status: 400 })
    }

    const service = createServiceClient()
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if ((profile?.role || '').toLowerCase() !== 'influencer') {
      return NextResponse.json({ error: 'Only influencers can generate tracked product links' }, { status: 403 })
    }

    const { data: influencerProfile } = await service
      .from('influencer_profiles')
      .select('affiliate_code, affiliate_store_id')
      .eq('user_id', authUser.id)
      .maybeSingle()

    const { data: product, error: productError } = await service
      .from('products')
      .select('id, name, link')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const siteUrl = getPublicSiteUrlFromRequest(request)
    const fallbackProductUrl = joinPublicUrl(siteUrl, `/marketplace/${productId}`)
    const baseOriginalUrl =
      typeof product.link === 'string' && product.link.trim().length > 0 ? product.link.trim() : fallbackProductUrl
    const affiliateTag =
      normalizeAmazonTrackingId(influencerProfile?.affiliate_code) ||
      normalizeAmazonTrackingId(process.env.AMAZON_DEFAULT_TRACKING_ID)
    const storeId =
      normalizeAmazonStoreId(influencerProfile?.affiliate_store_id) ||
      getAmazonStoreIdFromTrackingId(affiliateTag)
    const originalUrl = applyAmazonTrackingTag(baseOriginalUrl, affiliateTag, storeId)

    const { data: existingLink, error: existingLinkError } = await service
      .from('tracked_links')
      .select('id, original_url, masked_url, link_code')
      .eq('influencer_id', authUser.id)
      .eq('product_id', productId)
      .maybeSingle()

    if (existingLinkError) {
      throw existingLinkError
    }

    if (existingLink) {
      const linkCode = existingLink.link_code
      const storedMaskedUrl = existingLink.masked_url || getMaskedUrl(linkCode, siteUrl)
      const maskedUrl = appendVisibleAttributionParams(storedMaskedUrl, {
        storeId,
        amazonTrackId: affiliateTag,
        linkCode,
      })
      const needsUpdate =
        existingLink.masked_url !== storedMaskedUrl ||
        !existingLink.original_url ||
        existingLink.original_url !== originalUrl

      if (needsUpdate) {
        const { error: updateError } = await service
          .from('tracked_links')
          .update({
            masked_url: storedMaskedUrl,
            original_url: originalUrl,
          })
          .eq('id', existingLink.id)

        if (updateError) {
          console.warn('Failed to sync tracked link metadata:', updateError)
        }
      }

      return NextResponse.json({
        maskedUrl,
        linkCode,
        originalUrl,
        affiliateTag,
        storeId,
        productId,
        productName: product.name ?? null,
      })
    }

    const linkCode = await generateLinkCode()
    const storedMaskedUrl = getMaskedUrl(linkCode, siteUrl)
    const maskedUrl = appendVisibleAttributionParams(storedMaskedUrl, {
      storeId,
      amazonTrackId: affiliateTag,
      linkCode,
    })

    const { error: insertError } = await service.from('tracked_links').insert({
      influencer_id: authUser.id,
      product_id: productId,
      original_url: originalUrl,
      masked_url: storedMaskedUrl,
      link_code: linkCode,
      click_count: 0,
      is_active: true,
    })

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({
      maskedUrl,
      linkCode,
      originalUrl,
      affiliateTag,
      storeId,
      productId,
      productName: product.name ?? null,
    })
  } catch (error) {
    console.error('Product link error:', error)
    return NextResponse.json({ error: 'Failed to fetch product link' }, { status: 500 })
  }
}
