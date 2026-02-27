import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  // Build URL with explicit pool limits to prevent P2024 timeout on Render
  const baseUrl = process.env.DATABASE_URL || ''
  const url = baseUrl.includes('connection_limit')
    ? baseUrl
    : baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'connection_limit=5&pool_timeout=30'

  return new PrismaClient({
    datasources: {
      db: { url },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Always cache in globalThis to prevent multiple instances across requests in production
const prisma = globalThis.prisma ?? prismaClientSingleton()

globalThis.prisma = prisma

export default prisma
