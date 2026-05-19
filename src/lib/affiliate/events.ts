export type AffiliateEventLike = {
  event_type?: string | null
  amount?: number | string | null
  metadata?: Record<string, unknown> | null
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function isSimulationEvent(event: AffiliateEventLike): boolean {
  return String(event.metadata?.source || '').toLowerCase() === 'simulation'
}

export function isRealAffiliateEvent(event: AffiliateEventLike): boolean {
  return event.event_type === 'purchase' && !isSimulationEvent(event)
}

export function getAffiliateRevenueAmount(event: AffiliateEventLike): number {
  const metadata = event.metadata || {}
  return (
    toNumber(metadata.shippedRevenue) ||
    toNumber(metadata.revenue) ||
    toNumber(event.amount)
  )
}

export function getAffiliateCommissionAmount(event: AffiliateEventLike): number {
  const metadata = event.metadata || {}
  const explicitCommission =
    toNumber(metadata.commissionAmount) ||
    toNumber(metadata.commission) ||
    toNumber(metadata.earnings)

  if (explicitCommission > 0) {
    return explicitCommission
  }

  return getAffiliateRevenueAmount(event) * 0.15
}

export function getAffiliateOrderCount(event: AffiliateEventLike): number {
  const metadata = event.metadata || {}
  const shippedItems =
    toNumber(metadata.shippedItems) ||
    toNumber(metadata.itemsShipped) ||
    toNumber(metadata.orders)

  if (shippedItems > 0) {
    return shippedItems
  }

  return event.event_type === 'purchase' ? 1 : 0
}
