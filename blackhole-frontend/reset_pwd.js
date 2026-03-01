const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    try {
        const email = 'testuser@blackhole.com';
        const rawPassword = 'password123';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const user = await prisma.user.update({
            where: { email },
            data: { password: hashedPassword, isActive: true }
        });

        console.log(`Successfully reset password for ${email} to '${rawPassword}'`);
    } catch (e) {
        if (e.code === 'P2025') {
            // user doesn't exist, create it
            const hashedPassword = await bcrypt.hash('password123', 10);
            await prisma.user.create({
                data: {
                    email: 'testuser@blackhole.com',
                    password: hashedPassword,
                    name: 'Test User',
                    isActive: true
                }
            });
            console.log("Created test user testuser@blackhole.com with password 'password123'");
        } else {
            console.error("Database error:", e);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
