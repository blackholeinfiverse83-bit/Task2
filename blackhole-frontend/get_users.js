const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['error'] });

async function main() {
    try {
        console.log("Connecting to database...");
        const users = await prisma.user.findMany({
            select: { email: true, name: true, isActive: true }
        });
        console.log("Found users:", users);
    } catch (e) {
        console.error("Database error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
