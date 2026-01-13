import { redirect } from 'next/navigation'
import { createClient } from '@/lib/auth'
import prisma from '@/lib/prisma'

export default async function BrandLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    redirect('/login')
  }

  const email = authUser.email.toLowerCase().trim()
  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  })

  if (!dbUser) {
    redirect('/complete-profile')
  }

  if (dbUser.role !== 'BRAND') {
    redirect('/dashboard')
  }

  return <>{children}</>
}

