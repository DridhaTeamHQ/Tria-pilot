import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/auth'
import { canonicalizeAmazonTrackingId, normalizeAmazonTrackingId } from '@/lib/affiliate/amazon'

export const dynamic = 'force-dynamic'

const jsonRowSchema = z.object({
  trackingId: z.string().trim().min(1).max(64),
  reportDate: z.string().trim().min(4).max(40),
  orderedItems: z.union([z.number(), z.string()]).optional(),
  shippedItems: z.union([z.number(), z.string()]).optional(),
  revenue: z.union([z.number(), z.string()]).optional(),
  commission: z.union([z.number(), z.string()]).optional(),
  currency: z.string().trim().max(12).optional(),
  marketplace: z.string().trim().max(40).optional(),
  asin: z.string().trim().max(32).optional(),
  productName: z.string().trim().max(300).optional(),
})

const requestSchema = z.object({
  rows: z.array(jsonRowSchema).optional(),
  csv: z.string().min(1).optional(),
  delimiter: z.enum([',', '\t']).optional(),
}).refine((value) => Boolean(value.rows?.length || value.csv), {
  message: 'Provide rows or csv content.',
})

type ParsedImportRow = {
  trackingId: string
  reportDate: string
  orderedItems: number
  shippedItems: number
  revenue: number
  commission: number
  currency: string
  marketplace: string | null
  asin: string | null
  productName: string | null
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const cleaned = value.replace(/[^0-9.-]+/g, '')
  const parsed = Number(cleaned)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

function inferDelimiter(csv: string, requested?: ',' | '\t'): ',' | '\t' {
  if (requested) return requested
  const firstLine = csv.split(/\r?\n/, 1)[0] || ''
  return firstLine.includes('\t') ? '\t' : ','
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

function pickValue(record: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const normalizedKey = normalizeHeader(key)
    if (normalizedKey in record && record[normalizedKey]) {
      return record[normalizedKey]
    }
  }
  return ''
}

function parseCsvRows(csv: string, delimiter?: ',' | '\t'): ParsedImportRow[] {
  const resolvedDelimiter = inferDelimiter(csv, delimiter)
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0], resolvedDelimiter).map(normalizeHeader)
  const rows: ParsedImportRow[] = []

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line, resolvedDelimiter)
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))
    const trackingId = normalizeAmazonTrackingId(
      pickValue(record, ['tracking_id', 'tracking id', 'tag'])
    )
    const reportDate = normalizeDate(pickValue(record, ['date', 'report_date', 'day']))

    if (!trackingId || !reportDate) {
      continue
    }

    rows.push({
      trackingId,
      reportDate,
      orderedItems: parseNumber(pickValue(record, ['ordered_items', 'ordered items'])),
      shippedItems: parseNumber(pickValue(record, ['shipped_items', 'shipped items', 'items_shipped'])),
      revenue: parseNumber(
        pickValue(record, ['items_shipped_revenue', 'shipped_revenue', 'revenue', 'sales'])
      ),
      commission: parseNumber(
        pickValue(record, ['commission_income', 'commission', 'earnings', 'fees'])
      ),
      currency: pickValue(record, ['currency']) || 'INR',
      marketplace: pickValue(record, ['marketplace']) || null,
      asin: pickValue(record, ['asin']) || null,
      productName: pickValue(record, ['product_name', 'title', 'product']) || null,
    })
  }

  return rows
}

function normalizeImportRows(rows: z.infer<typeof jsonRowSchema>[]): ParsedImportRow[] {
  return rows
    .map((row) => {
      const trackingId = normalizeAmazonTrackingId(row.trackingId)
      const reportDate = normalizeDate(row.reportDate)
      if (!trackingId || !reportDate) return null

      return {
        trackingId,
        reportDate,
        orderedItems: parseNumber(row.orderedItems),
        shippedItems: parseNumber(row.shippedItems),
        revenue: parseNumber(row.revenue),
        commission: parseNumber(row.commission),
        currency: row.currency?.trim() || 'INR',
        marketplace: row.marketplace?.trim() || null,
        asin: row.asin?.trim() || null,
        productName: row.productName?.trim() || null,
      }
    })
    .filter((row): row is ParsedImportRow => Boolean(row))
}

function buildImportKey(row: {
  influencerId: string
  trackingId: string
  reportDate: string
  asin?: string | null
}) {
  return [
    row.influencerId,
    canonicalizeAmazonTrackingId(row.trackingId) || row.trackingId,
    row.reportDate,
    row.asin || '',
  ].join('::')
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as NextResponse, user: null, service: null }
  }

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if ((profile?.role || '').toLowerCase() !== 'admin') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) as NextResponse, user: null, service: null }
  }

  return { error: null, user, service }
}

export async function GET() {
  try {
    const auth = await requireAdmin()
    if (auth.error || !auth.service) {
      return auth.error!
    }

    const service = auth.service

    const [{ data: importEvents }, { data: influencers }] = await Promise.all([
      service
        .from('affiliate_events')
        .select('id, influencer_id, amount, metadata, created_at')
        .eq('event_type', 'purchase')
        .order('created_at', { ascending: false })
        .limit(1000),
      service
        .from('influencer_profiles')
        .select('user_id, affiliate_code, profiles!influencer_profiles_user_id_fkey(full_name, email)')
        .limit(1000),
    ])

    const importedEvents = (importEvents || []).filter((event) => {
      const metadata = (event.metadata || {}) as Record<string, unknown>
      return String(metadata.source || '') === 'amazon_associates_import'
    })

    const importGroups = new Map<string, {
      batchId: string
      importedAt: string
      rows: number
      revenue: number
      commission: number
      influencers: Set<string>
    }>()

    for (const event of importedEvents) {
      const metadata = (event.metadata || {}) as Record<string, unknown>
      const batchId =
        (typeof metadata.batchId === 'string' && metadata.batchId) ||
        (typeof metadata.importedAt === 'string' && metadata.importedAt) ||
        event.created_at

      const importedAt =
        (typeof metadata.importedAt === 'string' && metadata.importedAt) ||
        event.created_at

      const current = importGroups.get(batchId) || {
        batchId,
        importedAt,
        rows: 0,
        revenue: 0,
        commission: 0,
        influencers: new Set<string>(),
      }

      current.rows += 1
      current.revenue += parseNumber(metadata.shippedRevenue ?? metadata.revenue ?? event.amount)
      current.commission += parseNumber(metadata.commissionAmount ?? metadata.commission)
      if (event.influencer_id) current.influencers.add(event.influencer_id)
      importGroups.set(batchId, current)
    }

    const recentImports = Array.from(importGroups.values())
      .sort((a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime())
      .slice(0, 8)
      .map((group) => ({
        batchId: group.batchId,
        importedAt: group.importedAt,
        rows: group.rows,
        revenue: group.revenue,
        commission: group.commission,
        matchedInfluencers: group.influencers.size,
      }))

    const creators = (influencers || []).map((row: any) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        userId: row.user_id,
        name: profile?.full_name || profile?.email || 'Unknown creator',
        affiliateTag: normalizeAmazonTrackingId(row.affiliate_code),
      }
    })

    const missingTrackingIds = creators.filter((creator) => !creator.affiliateTag)
    const trackedCreators = creators.length - missingTrackingIds.length
    const latestImportAt = recentImports[0]?.importedAt || null

    return NextResponse.json({
      summary: {
        totalCreators: creators.length,
        trackedCreators,
        missingTrackingIds: missingTrackingIds.length,
        importBatches: recentImports.length,
        latestImportAt,
      },
      recentImports,
      missingTrackingIds: missingTrackingIds.slice(0, 20),
    })
  } catch (error) {
    console.error('[amazon-import:get] error:', error)
    return NextResponse.json({ error: 'Failed to load affiliate import health' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdmin()
    if (auth.error || !auth.service || !auth.user) {
      return auth.error!
    }
    const { user, service } = auth

    const body = await request.json().catch(() => null)
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid import payload', details: parsed.error.flatten() }, { status: 400 })
    }

    const rows = parsed.data.rows?.length
      ? normalizeImportRows(parsed.data.rows)
      : parseCsvRows(parsed.data.csv || '', parsed.data.delimiter)

    if (!rows.length) {
      return NextResponse.json({ error: 'No valid Amazon report rows found' }, { status: 400 })
    }

    const { data: influencers, error: influencerLookupError } = await service
      .from('influencer_profiles')
      .select('user_id, affiliate_code')
      .not('affiliate_code', 'is', null)

    if (influencerLookupError) {
      throw influencerLookupError
    }

    const influencerByTrackingId = new Map<string, string>()
    for (const influencer of influencers || []) {
      const trackingId = canonicalizeAmazonTrackingId(influencer.affiliate_code)
      if (trackingId) {
        influencerByTrackingId.set(trackingId, influencer.user_id)
      }
    }

    const matchedRows = rows
      .map((row) => ({
        ...row,
        influencerId: influencerByTrackingId.get(canonicalizeAmazonTrackingId(row.trackingId) || '') || null,
      }))
      .filter((row) => row.influencerId)

    const unmatchedTrackingIds = Array.from(
      new Set(
        rows
          .filter((row) => !influencerByTrackingId.has(canonicalizeAmazonTrackingId(row.trackingId) || ''))
          .map((row) => row.trackingId)
      )
    )

    if (!matchedRows.length) {
      return NextResponse.json({
        error: 'No rows matched configured influencer tracking IDs',
        unmatchedTrackingIds,
      }, { status: 400 })
    }

    const reportDates = matchedRows.map((row) => row.reportDate).sort()
    const startIso = `${reportDates[0]}T00:00:00.000Z`
    const endIso = `${reportDates[reportDates.length - 1]}T23:59:59.999Z`
    const influencerIds = Array.from(new Set(matchedRows.map((row) => row.influencerId!)))

    const { data: existingEvents } = await service
      .from('affiliate_events')
      .select('influencer_id, metadata, created_at')
      .eq('event_type', 'purchase')
      .in('influencer_id', influencerIds)
      .gte('created_at', startIso)
      .lte('created_at', endIso)

    const existingKeys = new Set<string>()
    for (const event of existingEvents || []) {
      const metadata = (event.metadata || {}) as Record<string, unknown>
      if (String(metadata.source || '') !== 'amazon_associates_import') continue
      const trackingId = canonicalizeAmazonTrackingId(metadata.trackingId)
      const reportDate = typeof metadata.reportDate === 'string' ? metadata.reportDate : null
      if (!trackingId || !reportDate || !event.influencer_id) continue
      existingKeys.add(
        buildImportKey({
          influencerId: event.influencer_id,
          trackingId,
          reportDate,
          asin: typeof metadata.asin === 'string' ? metadata.asin : null,
        })
      )
    }

    const inserts = []
    let skippedDuplicates = 0
    const batchId = `amazon-${Date.now()}`
    const importedAt = new Date().toISOString()

    for (const row of matchedRows) {
      const dedupeKey = buildImportKey({
        influencerId: row.influencerId!,
        trackingId: row.trackingId,
        reportDate: row.reportDate,
        asin: row.asin,
      })

      if (existingKeys.has(dedupeKey)) {
        skippedDuplicates += 1
        continue
      }

      existingKeys.add(dedupeKey)
      inserts.push({
        influencer_id: row.influencerId,
        product_id: null,
        tracked_link_id: null,
        event_type: 'purchase',
        amount: row.revenue,
        currency: row.currency || 'INR',
        metadata: {
          source: 'amazon_associates_import',
          trackingId: row.trackingId,
          reportDate: row.reportDate,
          orderedItems: row.orderedItems,
          shippedItems: row.shippedItems,
          revenue: row.revenue,
          shippedRevenue: row.revenue,
          commissionAmount: row.commission,
          marketplace: row.marketplace,
          asin: row.asin,
          productName: row.productName,
          importedBy: user.id,
          importedAt,
          batchId,
        },
        created_at: `${row.reportDate}T12:00:00.000Z`,
      })
    }

    if (inserts.length) {
      const { error: insertError } = await service.from('affiliate_events').insert(inserts)
      if (insertError) throw insertError
    }

    return NextResponse.json({
      success: true,
      importedRows: inserts.length,
      skippedDuplicates,
      matchedInfluencers: influencerIds.length,
      unmatchedTrackingIds,
    })
  } catch (error) {
    console.error('[amazon-import] error:', error)
    return NextResponse.json({ error: 'Failed to import Amazon report' }, { status: 500 })
  }
}
