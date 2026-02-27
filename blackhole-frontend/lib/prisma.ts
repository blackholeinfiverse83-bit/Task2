import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // Parse and optimize DATABASE_URL for serverless environment
  const baseUrl = process.env.DATABASE_URL || ''
  
  // Remove existing connection params and add optimized ones
  const urlWithoutParams = baseUrl.split('?')[0] || baseUrl
  
  // Build URL with optimized connection pool settings
  // connection_limit: 10 (up from 5) - allows more concurrent connections
  // pool_timeout: 10 (down from 30) - faster timeout = faster error detection
  // connect_timeout: 10 - faster connection attempts
  const optimizedParams = [
    'sslmode=require',
    'connection_limit=10',
    'pool_timeout=10',
    'connect_timeout=10'
  ].join('&')
  
  const url = `${urlWithoutParams}?${optimizedParams}`

  console.log('Prisma initialized with optimized connection pool (limit: 10, timeout: 10s)')

  return new PrismaClient({
    datasources: {
      db: { url },
    },
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn', 'query'] 
      : ['error', 'warn'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Global singleton to prevent multiple instances in serverless environments
const prisma = globalThis.prisma ?? prismaClientSingleton()

// Always store in globalThis (works for both dev and production)
if (!globalThis.prisma) {
  globalThis.prisma = prisma
}

// Graceful shutdown handlers to prevent connection leaks
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    console.log('Disconnecting Prisma...')
    await prisma.$disconnect()
  })
  
  process.on('SIGINT', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

export default prisma
