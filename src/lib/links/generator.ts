import prisma from '@/lib/prisma'

/**
 * Generate a unique short link code (6-8 alphanumeric characters)
 * Retries if collision occurs
 */
export async function generateLinkCode(length: number = 7): Promise<string> {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const maxRetries = 10

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Generate random code
    let code = ''
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Check if code already exists
    const existing = await prisma.trackedLink.findUnique({
      where: { linkCode: code },
      select: { id: true },
    })

    if (!existing) {
      return code
    }
  }

  // If all retries failed, try with longer code
  return generateLinkCode(length + 1)
}

