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

  // Production (serverless): use longer connection timeout so direct Postgres (e.g. port 5432)
  // has time to connect; 2s was too short and caused fallback to Supabase-only in admin.
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: isProduction ? 2 : 5,
    min: 0,
    idleTimeoutMillis: isProduction ? 5000 : 10000,
    connectionTimeoutMillis: isProduction ? 10000 : 10000,
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

// Reuse one client per process (critical in serverless: avoids new Pool on every request)
const prisma = globalForPrisma.prisma ?? createPrismaClient()
globalForPrisma.prisma = prisma

export default prisma
