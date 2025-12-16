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

  const isProduction = process.env.NODE_ENV === 'production'

  // Optimized connection pool configuration:
  // - Production (serverless): minimal connections + fast cleanup
  // - Development (local dev): allow a few concurrent connections and longer timeouts
  //
  // Why: Next.js dev often triggers concurrent SSR requests; a pool max=1 with a 2s timeout
  // can cause "Connection terminated due to connection timeout" under normal navigation.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: isProduction ? 1 : 5,
    min: 0,
    idleTimeoutMillis: isProduction ? 2000 : 10000,
    connectionTimeoutMillis: isProduction ? 2000 : 10000,
    allowExitOnIdle: true,
    // Keep connections alive but very short for serverless
    keepAlive: true,
    keepAliveInitialDelayMillis: 2000,
  })

  // Handle pool errors gracefully - don't crash on connection errors
  // In serverless, connections can be terminated abruptly
  pool.on('error', (err: Error & { code?: string }) => {
    // Only log fatal errors, ignore connection termination errors
    if (err.code === 'XX000' || err.message?.includes('DbHandler exited')) {
      // This is a connection termination - expected in serverless
      // The pool will automatically create a new connection on next query
      console.warn('Database connection terminated (serverless cleanup):', err.code)
    } else {
      console.error('Database pool error:', err)
    }
    // Don't throw - let Prisma handle reconnection automatically
  })

  // Handle new connections - set timeouts and pooler mode
  pool.on('connect', (client) => {
    // Set statement timeout to prevent hanging queries
    client.query('SET statement_timeout = 30000').catch(() => {
      // Ignore - connection might be closing
    })

    // Set connection pooler mode if using Supabase
    if (process.env.DATABASE_URL?.includes('pgbouncer=true')) {
      client.query('SET application_name = "tria-app"').catch(() => {
        // Ignore errors - not critical
      })
    }
  })

  // Handle connection removal (cleanup)
  pool.on('remove', () => {
    // Connection removed from pool - normal in serverless
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
