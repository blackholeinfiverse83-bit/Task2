const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

async function check() {
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        console.log(`Connection OK in ${Date.now() - start}ms`);
    } catch (e) {
        console.error("Connection failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

check();
