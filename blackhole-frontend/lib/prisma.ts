import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

// Always cache in globalThis to prevent pool exhaustion in production
// Previously this was only done in development — causing a new client per request in prod
const prisma = globalThis.prisma ?? prismaClientSingleton()

globalThis.prisma = prisma

export default prisma
