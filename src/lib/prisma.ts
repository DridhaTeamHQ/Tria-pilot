import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Optimized connection pool configuration for Supabase pooler
  // Supabase pooler typically limits to 5 connections, so we use 4 to be safe
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4, // Reduced for Supabase pooler (pooler limits to 5, we use 4 for safety)
    min: 0, // No minimum - connections created on demand (better for serverless)
    idleTimeoutMillis: 5000, // Faster cleanup (5 seconds) for serverless
    connectionTimeoutMillis: 3000, // Faster failure detection (3 seconds)
    allowExitOnIdle: true,
    // Keep connections alive but shorter for serverless
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
  })

  // Handle pool errors gracefully with retry logic
  pool.on('error', (err) => {
    console.error('Database pool error:', err)
    // Don't throw - let Prisma handle reconnection
    // Log but don't crash the application
  })

  // Handle connection errors
  pool.on('connect', (client) => {
    // Set statement timeout to prevent hanging queries
    client.query('SET statement_timeout = 30000').catch((err) => {
      console.error('Failed to set statement timeout:', err)
    })
    
    // Set connection pooler mode if using Supabase
    if (process.env.DATABASE_URL?.includes('pgbouncer=true')) {
      client.query('SET application_name = "tria-app"').catch(() => {
        // Ignore errors - not critical
      })
    }
  })


  // Use the official Prisma pg adapter
  const adapter = new PrismaPg(pool)

  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

  // Prisma manages connections automatically via pool - no need for explicit $connect()
  // The pool will establish connections on-demand when queries are executed

  return client
}

const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
