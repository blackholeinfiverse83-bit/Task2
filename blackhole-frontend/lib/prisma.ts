import { PrismaClient } from '@prisma/client'

// For serverless environments (Render free tier), we need a different strategy
// Using connection_limit=1 and creating/disposing clients per request
// prevents pool exhaustion

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const baseUrl = process.env.DATABASE_URL || ''
  
  // Remove existing connection params
  const urlWithoutParams = baseUrl.split('?')[0] || baseUrl
  
  // For serverless: use connection_limit=1 to prevent pool exhaustion
  // Each request gets its own connection that gets released immediately
  const optimizedParams = [
    'sslmode=require',
    'connection_limit=1',
    'pool_timeout=5',
    'connect_timeout=5'
  ].join('&')
  
  const url = `${urlWithoutParams}?${optimizedParams}`

  console.log('Prisma initialized (serverless: connection_limit=1)')

  return new PrismaClient({
    datasources: {
      db: { url },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

// Development: singleton
// Production serverless: new client per request
const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Helper for serverless: auto-disconnect after operations
export async function withPrisma<T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  const isServerless = process.env.NODE_ENV === 'production'
  const client = isServerless ? createPrismaClient() : prisma
  
  try {
    return await callback(client)
  } finally {
    if (isServerless) {
      await client.$disconnect()
    }
  }
}

export default prisma
