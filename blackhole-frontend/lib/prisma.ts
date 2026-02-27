import { PrismaClient } from '@prisma/client'

// Force cleanup any existing connections before creating new ones
if (globalThis.prisma) {
  console.log('Force disconnecting existing Prisma instance...')
  try {
    await (globalThis.prisma as PrismaClient).$disconnect()
  } catch (e) {
    // Ignore errors during cleanup
  }
  delete (globalThis as any).prisma
}

// For serverless: minimal connection pool with aggressive cleanup
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const baseUrl = process.env.DATABASE_URL || ''
  
  // Use Supabase's PgBouncer pooler (port 6543) if available, otherwise direct
  const isPooler = baseUrl.includes(':6543')
  
  // Remove existing connection params
  const urlWithoutParams = baseUrl.split('?')[0] || baseUrl
  
  // Connection strategy:
  // - connection_limit=1: minimal connections
  // - pool_timeout=3: fail fast (3 seconds)
  // - connect_timeout=3: fail fast
  const optimizedParams = [
    'sslmode=require',
    'connection_limit=1',
    'pool_timeout=3',
    'connect_timeout=3'
  ].join('&')
  
  const url = `${urlWithoutParams}?${optimizedParams}`

  console.log(`Prisma initialized (${isPooler ? 'PgBouncer' : 'direct'}, connection_limit=1)`)

  return new PrismaClient({
    datasources: {
      db: { url },
    },
    // In production, only log errors
    log: ['error'],
  })
}

// Helper with aggressive retry and cleanup
export async function withPrisma<T>(
  callback: (prisma: PrismaClient) => Promise<T>,
  maxRetries = 5
): Promise<T> {
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Create fresh client for each attempt
    const client = createPrismaClient()
    
    try {
      const result = await callback(client)
      // Success: disconnect and return
      await client.$disconnect().catch(() => {})
      return result
    } catch (error) {
      lastError = error as Error
      
      // Always cleanup on error
      await client.$disconnect().catch(() => {})
      
      // Only retry on connection errors
      if (
        error instanceof Error && 
        (error.message.includes('connection pool') || 
         error.message.includes('P2024') ||
         error.message.includes('Timed out') ||
         error.message.includes('P1001') || // Can't reach database
         error.message.includes('P1002'))   // Timeout
      ) {
        const delay = Math.min(1000 * attempt, 5000) // Exponential backoff: 1s, 2s, 3s, 4s, 5s
        console.log(`Connection attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      // Non-connection errors: throw immediately
      throw error
    }
  }
  
  throw lastError || new Error('Database connection failed after retries')
}

// Export singleton for development only
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
