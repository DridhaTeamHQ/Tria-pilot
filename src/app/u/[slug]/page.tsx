import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink, Instagram, Youtube, Facebook, BadgeCheck, Users, TrendingUp, Sparkles } from 'lucide-react'
import { AppImage } from '@/components/ui/AppImage'
import { createServiceClient } from '@/lib/auth'
import { getGenerationTagFromDob, normalizeDateOfBirth } from '@/lib/profile-demographics'
import { getJobOutputsFromRecord } from '@/lib/tryon/job-outputs'

export const dynamic = 'force-dynamic'

/**
 * Resolve a creator from a slug. Currently maps slug → email local part.
 * Shared between generateMetadata and the page component.
 */
async function resolveCreatorBySlug(slug: string) {
  const normalizedSlug = decodeURIComponent(slug).trim().toLowerCase()
  if (!normalizedSlug) return null

  const service = createServiceClient()
  const { data: candidates } = await service
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, approval_status, onboarding_completed')
    .ilike('email', `${normalizedSlug}@%`)
    .limit(5)

  if (!Array.isArray(candidates)) return null

  const profile = candidates.find((c) => {
    const email = String(c.email || '').toLowerCase()
    return email.split('@')[0] === normalizedSlug
  })

  if (
    !profile ||
    String(profile.role || '').toLowerCase() !== 'influencer' ||
    String(profile.approval_status || '').toLowerCase() !== 'approved' ||
    !profile.onboarding_completed
  ) {
    return null
  }
  return profile
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const profile = await resolveCreatorBySlug(slug)
  if (!profile) {
    return {
      title: 'Creator not found | Kiwikoo',
      robots: { index: false, follow: false },
    }
  }

  const service = createServiceClient()
  const { data: ip } = await service
    .from('influencer_profiles')
    .select('bio, niches')
    .eq('user_id', profile.id)
    .maybeSingle()

  const name = profile.full_name || slug
  const bio =
    (typeof ip?.bio === 'string' && ip.bio.trim()) ||
    'Creator on Kiwikoo — AI-powered fashion try-ons & creator commerce.'
  const niches = Array.isArray(ip?.niches) ? ip.niches.slice(0, 3).join(' · ') : ''
  const title = niches ? `${name} — ${niches} | Kiwikoo Creator` : `${name} | Kiwikoo Creator`

  return {
    title,
    description: bio.slice(0, 160),
    alternates: { canonical: `/u/${slug}` },
    openGraph: {
      title,
      description: bio.slice(0, 200),
      type: 'profile',
      url: `/u/${slug}`,
      images: profile.avatar_url ? [{ url: profile.avatar_url, alt: name }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: bio.slice(0, 200),
      images: profile.avatar_url ? [profile.avatar_url] : undefined,
    },
    robots: { index: true, follow: true },
  }
}

type SocialKey = 'instagram' | 'youtube' | 'facebook' | 'snapchat'

const SOCIAL_LABELS: Record<SocialKey, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  snapchat: 'Snapchat',
}

function normalizeSlug(value: string) {
  return decodeURIComponent(value).trim().toLowerCase()
}

function buildSocialUrl(platform: SocialKey, rawValue: string) {
  const value = rawValue.trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value

  const clean = value.replace(/^@/, '')
  switch (platform) {
    case 'instagram':
      return `https://instagram.com/${clean}`
    case 'youtube':
      return `https://youtube.com/@${clean}`
    case 'facebook':
      return `https://facebook.com/${clean}`
    case 'snapchat':
      return `https://snapchat.com/add/${clean}`
    default:
      return null
  }
}

function formatPercent(value: unknown) {
  const num = Number(value || 0)
  return `${Number.isFinite(num) ? num : 0}%`
}

function formatFollowers(value: unknown) {
  const num = Number(value || 0)
  if (!Number.isFinite(num)) return '0'
  return new Intl.NumberFormat('en-IN').format(num)
}

export default async function PublicInfluencerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const normalizedSlug = normalizeSlug(slug)
  if (!normalizedSlug) {
    notFound()
  }

  const profile = await resolveCreatorBySlug(slug)
  if (!profile) {
    notFound()
  }

  const service = createServiceClient()

  const { data: influencerProfile } = await service
    .from('influencer_profiles')
    .select('bio, niches, socials, followers, engagement_rate, audience_rate, badge_tier, badge_score')
    .eq('user_id', profile.id)
    .maybeSingle()

  let dateOfBirth: string | null = null
  let generationTag: string | null = null
  try {
    const { data: authLookup, error: authLookupError } = await service.auth.admin.getUserById(profile.id)
    if (authLookupError) {
      console.warn('Public profile demographics lookup failed:', authLookupError.message)
    } else {
      dateOfBirth = normalizeDateOfBirth(authLookup.user?.user_metadata?.date_of_birth)
      generationTag = getGenerationTagFromDob(dateOfBirth)
    }
  } catch (error) {
    console.warn('Public profile demographics lookup failed:', error)
  }

  const socials = (influencerProfile?.socials || {}) as Partial<Record<SocialKey, string>>
  const socialEntries = (Object.entries(socials) as Array<[SocialKey, string]>)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([platform, value]) => ({
      platform,
      label: SOCIAL_LABELS[platform],
      href: buildSocialUrl(platform, value),
      value,
    }))
    .filter((entry) => Boolean(entry.href))

  const displayName = profile.full_name || normalizedSlug
  const avatarFallback = displayName.charAt(0).toUpperCase()
  const niches = Array.isArray(influencerProfile?.niches) ? influencerProfile.niches : []

  // Fetch try-on portfolio (public-safe — only completed jobs with output URLs)
  const { data: jobs } = await service
    .from('generation_jobs')
    .select('id, status, output_image_path, settings, created_at')
    .eq('user_id', profile.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(36)

  const tryOns: Array<{ jobId: string; outputIndex: number; imageUrl: string; createdAt: string }> = (jobs || [])
    .flatMap((job: any) => {
      const outputs = getJobOutputsFromRecord(job)
      return outputs
        .filter((o) => o.status === 'completed' && o.imageUrl)
        // Only HTTPS URLs on public page (skip base64 to avoid huge HTML)
        .filter((o): o is typeof o & { imageUrl: string } => Boolean(o.imageUrl?.startsWith('http')))
        .map((o, idx) => ({
          jobId: job.id,
          outputIndex: idx,
          imageUrl: o.imageUrl,
          createdAt: job.created_at,
        }))
    })
    .slice(0, 24)

  // JSON-LD Person schema for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: displayName,
    description: influencerProfile?.bio || undefined,
    image: profile.avatar_url || undefined,
    url: `/u/${normalizedSlug}`,
    knowsAbout: niches.length > 0 ? niches : undefined,
    sameAs: socialEntries.map((s) => s.href).filter(Boolean),
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-20 pt-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 border-[3px] border-black bg-white px-4 py-2 text-sm font-black uppercase tracking-[0.16em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="border-[4px] border-black bg-white p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="relative h-36 w-36 shrink-0 overflow-hidden border-[4px] border-black bg-[#FFD93D] shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {profile.avatar_url ? (
                  <AppImage src={profile.avatar_url} alt={displayName} className="object-cover" sizes="144px" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-5xl font-black text-black/70">
                    {avatarFallback}
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="inline-flex items-center gap-2 border-[3px] border-black bg-[#FFD93D] px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <BadgeCheck className="h-4 w-4" />
                  Public Profile
                </div>
                <h1 className="mt-4 text-4xl font-black uppercase tracking-tight text-black sm:text-5xl">
                  {displayName}
                </h1>
                <p className="mt-3 max-w-2xl border-l-[4px] border-[#FF8C69] pl-4 text-base font-bold text-black/65 sm:text-lg">
                  {influencerProfile?.bio || 'Kiwikoo creator profile.'}
                </p>

                {niches.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {niches.map((niche) => (
                      <span
                        key={niche}
                        className="border-[2px] border-black bg-[#FFF3E8] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                      >
                        {String(niche)}
                      </span>
                    ))}
                  </div>
                )}

                {generationTag && (
                  <div className="mt-4">
                    <span className="inline-flex border-[2px] border-black bg-[#B4F056] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                      {generationTag}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="border-[3px] border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center border-[3px] border-black bg-[#FFD93D] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-3xl font-black text-black">{formatFollowers(influencerProfile?.followers)}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-black/55">Followers</div>
              </div>

              <div className="border-[3px] border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center border-[3px] border-black bg-[#FF8C69] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="text-3xl font-black text-black">{formatPercent(influencerProfile?.engagement_rate)}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-black/55">Engagement</div>
              </div>

              <div className="border-[3px] border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center border-[3px] border-black bg-[#FFF1B8] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <BadgeCheck className="h-6 w-6" />
                </div>
                <div className="text-3xl font-black text-black">{Number(influencerProfile?.badge_score || 0)}</div>
                <div className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-black/55">
                  {String(influencerProfile?.badge_tier || 'Creator')}
                </div>
              </div>
            </div>

            {socialEntries.length > 0 && (
              <div className="border-[3px] border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-black/55">Social Links</h2>
                <div className="space-y-3">
                  {socialEntries.map((entry) => {
                    const Icon =
                      entry.platform === 'instagram'
                        ? Instagram
                        : entry.platform === 'youtube'
                          ? Youtube
                          : entry.platform === 'facebook'
                            ? Facebook
                            : ExternalLink

                    return (
                      <a
                        key={entry.platform}
                        href={entry.href || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 border-[2px] border-black bg-[#F8F6F0] px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                      >
                        <span className="inline-flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span className="text-sm font-black uppercase">{entry.label}</span>
                        </span>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* ── TRY-ON PORTFOLIO ───────────────────────────────── */}
        {tryOns.length > 0 && (
          <section className="mt-12 border-[4px] border-black bg-white p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="inline-flex items-center gap-2 border-[3px] border-black bg-[#A78BFA]/30 px-3 py-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <Sparkles className="h-4 w-4" />
                <span className="text-[11px] font-black uppercase tracking-[0.18em]">Try-On Portfolio</span>
              </div>
              <span className="text-sm font-bold text-black/50">
                {tryOns.length} AI try-on visual{tryOns.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {tryOns.map((item) => (
                <a
                  key={`${item.jobId}-${item.outputIndex}`}
                  href={item.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-[3/4] block overflow-hidden border-[3px] border-black bg-black/5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-0.5"
                >
                  <AppImage
                    src={item.imageUrl}
                    alt={`${displayName} try-on`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(min-width: 768px) 25vw, 50vw"
                  />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── CTA ────────────────────────────────────────────── */}
        <section className="mt-10 border-[4px] border-black bg-[#B4F056] p-6 text-center shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] sm:p-8">
          <h2 className="text-2xl font-black uppercase tracking-tight text-black sm:text-3xl">
            Want to work with {displayName.split(' ')[0]}?
          </h2>
          <p className="mt-2 text-sm font-bold text-black/70 max-w-xl mx-auto">
            Brands on Kiwikoo can collaborate with creators directly through our platform.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block border-[3px] border-black bg-white px-6 py-3 text-sm font-black uppercase tracking-[0.16em] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            Sign in as a brand →
          </Link>
        </section>
      </div>

      {/* JSON-LD structured data for SEO */}
      <script
        type="application/ld+json"
        // SECURITY: escape `<`, `>`, `&` so user-controlled fields (name,
        // bio, niches) cannot break out of the <script> tag. Without this,
        // a creator could embed `</script><script>...` in their bio to
        // execute arbitrary JS in any brand viewing their public profile.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd)
            .replace(/</g, '\\u003c')
            .replace(/>/g, '\\u003e')
            .replace(/&/g, '\\u0026'),
        }}
      />
    </div>
  )
}
