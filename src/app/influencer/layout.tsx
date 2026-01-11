import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

export default async function InfluencerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Get user from database
  const dbUser = await prisma.user.findUnique({
    where: { email: authUser.email! },
    select: { id: true, role: true },
  })

  if (!dbUser || dbUser.role !== 'INFLUENCER') {
    redirect('/dashboard')
  }

  // Check influencer approval status
  const { data: application } = await supabase
    .from('influencer_applications')
    .select('status')
    .eq('user_id', dbUser.id)
    .single()

  // If not approved, redirect to onboarding (but allow onboarding pages themselves)
  const isApproved = application?.status === 'approved'
  
  // Note: Individual pages will check approval status and redirect if needed
  // This layout just ensures user is authenticated and is an influencer
  return <>{children}</>
}
