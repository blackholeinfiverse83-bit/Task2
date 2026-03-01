const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query', 'info', 'warn', 'error'] });

async function check() {
    try {
        const start = Date.now();
        const user = await prisma.user.findFirst();
        console.log(`Connection OK in ${Date.now() - start}ms`);
        console.log(`Found a user:`, user ? user.email : 'No users');
    } catch (e) {
        console.error("Connection failed:", e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
