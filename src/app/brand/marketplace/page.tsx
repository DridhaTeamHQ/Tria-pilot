/**
 * LEGACY BRAND MARKETPLACE ROUTE
 *
 * Brand flow uses dedicated creators/campaign routes.
 * Keep this as a safe redirect target for old links.
 */
import { redirect } from 'next/navigation'

export default function BrandMarketplacePage() {
  redirect('/brand/campaigns')
}
