import { PrismaClient } from '@prisma/client'

// Extend globalThis type
declare global {
  var prisma: PrismaClient | undefined
  var prismaNews: PrismaClient | undefined
}

// Create Prisma client for AUTH database (User, Session, etc.)
function createAuthPrismaClient() {
  const baseUrl = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || ''

  const urlWithoutParams = baseUrl.split('?')[0] || baseUrl

  const optimizedParams = [
    'sslmode=require',
    'connection_limit=1',
    'pool_timeout=30',
    'connect_timeout=30'
  ].join('&')

  const url = `${urlWithoutParams}?${optimizedParams}`

  console.log('Auth Prisma initialized (connection_limit=1)')

  return new PrismaClient({
    datasources: {
      db: { url },
    },
    log: ['error'],
  })
}

// Create Prisma client for NEWS database (ScrapedNews)
function createNewsPrismaClient() {
  const baseUrl = process.env.NEWS_DATABASE_URL || ''

  if (!baseUrl) {
    console.warn('NEWS_DATABASE_URL is not set! News database will be unavailable.')
    // Fall back to auth database URL – news queries may fail if ScrapedNews table doesn't exist there
    const fallback = process.env.DATABASE_URL || process.env.AUTH_DATABASE_URL || ''
    if (!fallback) throw new Error('No database URL available for news client')
    return new PrismaClient({
      datasources: { db: { url: fallback } },
      log: ['error'],
    })
  }

  // Strip existing query params, then re-add our connection tune params
  const urlWithoutParams = baseUrl.split('?')[0] || baseUrl

  console.log('News Prisma initialized (connection_limit=1)')
  const optimizedParams = [
    'sslmode=require',
    'connection_limit=1',
    'pool_timeout=30',
    'connect_timeout=30'
  ].join('&')

  const url = `${urlWithoutParams}?${optimizedParams}`

  console.log('News Prisma initialized (connection_limit=1)')

  return new PrismaClient({
    datasources: {
      db: { url },
    },
    log: ['error'],
  })
}

// Helper with aggressive retry and cleanup
async function withRetry<T>(
  createClient: () => PrismaClient,
  callback: (prisma: PrismaClient) => Promise<T>,
  maxRetries = 5
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = createClient()

    try {
      const result = await callback(client)
      await client.$disconnect().catch(() => { })
      return result
    } catch (error) {
      lastError = error as Error
      await client.$disconnect().catch(() => { })

      if (
        error instanceof Error &&
        (error.message.includes('connection pool') ||
          error.message.includes('P2024') ||
          error.message.includes('Timed out') ||
          error.message.includes('P1001') ||
          error.message.includes('P1002'))
      ) {
        const delay = Math.min(1000 * attempt, 5000)
        console.log(`Connection attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }

  throw lastError || new Error('Database connection failed after retries')
}

// ============ AUTH DATABASE (User, Session, etc.) ============

export const authPrisma = globalThis.prisma ?? createAuthPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = authPrisma
}

export async function withAuthPrisma<T>(
  callback: (prisma: PrismaClient) => Promise<T>,
  maxRetries = 5
): Promise<T> {
  return withRetry(createAuthPrismaClient, callback, maxRetries)
}

export default authPrisma

// ============ NEWS DATABASE (ScrapedNews) ============

export const newsPrisma = globalThis.prismaNews ?? createNewsPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaNews = newsPrisma
}

export async function withNewsPrisma<T>(
  callback: (prisma: PrismaClient) => Promise<T>,
  maxRetries = 5
): Promise<T> {
  return withRetry(createNewsPrismaClient, callback, maxRetries)
}

// Export for backwards compatibility
export const prisma = authPrisma
export const withPrisma = withAuthPrisma
