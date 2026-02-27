import { PrismaClient } from '@prisma/client'

// Extend globalThis type
declare global {
  var prisma: PrismaClient | undefined
}

// For serverless: minimal connection pool with aggressive cleanup
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

// Development singleton
const prisma = globalThis.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma
