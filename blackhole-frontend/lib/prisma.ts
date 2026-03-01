import { PrismaClient } from '@prisma/client'

// Extend globalThis type for singleton caching
declare global {
  var prisma: PrismaClient | undefined
  var prismaNews: PrismaClient | undefined
}

// ============ AUTH DATABASE (User, Session, etc.) ============

function createAuthPrismaClient() {
  const baseUrl = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || ''
  const urlWithoutParams = baseUrl.split('?')[0] || baseUrl
  const url = `${urlWithoutParams}?sslmode=require&connection_limit=2&pool_timeout=20&connect_timeout=15`

  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  })
}

// Singleton — cached in globalThis to prevent new clients on every request
export const authPrisma = globalThis.prisma ?? createAuthPrismaClient()
globalThis.prisma = authPrisma

// ============ NEWS DATABASE (ScrapedNews) ============

function createNewsPrismaClient() {
  const baseUrl = process.env.NEWS_DATABASE_URL || ''

  if (!baseUrl) {
    console.warn('NEWS_DATABASE_URL not set — falling back to auth DB')
    return authPrisma // reuse auth client as fallback
  }

  const urlWithoutParams = baseUrl.split('?')[0] || baseUrl
  const url = `${urlWithoutParams}?sslmode=require&connection_limit=2&pool_timeout=20&connect_timeout=15`

  return new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  })
}

// Singleton — cached in globalThis
export const newsPrisma = globalThis.prismaNews ?? createNewsPrismaClient()
globalThis.prismaNews = newsPrisma

// ============ HELPERS ============

// Use the SINGLETON client with retry (no new clients per attempt)
async function withClientRetry<T>(
  client: PrismaClient,
  callback: (prisma: PrismaClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callback(client)
    } catch (error) {
      lastError = error as Error
      const isRetryable = error instanceof Error && (
        error.message.includes('connection pool') ||
        error.message.includes('Timed out') ||
        error.message.includes('P1001') ||
        error.message.includes('P1002') ||
        error.message.includes('P2024')
      )
      if (isRetryable && attempt < maxRetries) {
        const delay = Math.min(2000 * attempt, 8000)
        console.log(`DB retry ${attempt}/${maxRetries} in ${delay}ms...`)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw error
    }
  }
  throw lastError || new Error('Database connection failed')
}

export async function withAuthPrisma<T>(
  callback: (prisma: PrismaClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  return withClientRetry(authPrisma, callback, maxRetries)
}

export async function withNewsPrisma<T>(
  callback: (prisma: PrismaClient) => Promise<T>,
  maxRetries = 3
): Promise<T> {
  return withClientRetry(newsPrisma, callback, maxRetries)
}

// Backwards compatibility exports
export default authPrisma
export const prisma = authPrisma
export const withPrisma = withAuthPrisma
