
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('superadmin123', 10);

    const department = await prisma.department.upsert({
        where: { name: 'Администрация' },
        update: {},
        create: { name: 'Администрация' },
    });

    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            name: 'Администратор',
            email: 'admin@example.com',
            passwordHash: hashedPassword,
            role: 'admin',
            departmentId: department.id,
        },
    });

    console.log('Admin created or already exists:', admin.email);
}

main()
    .catch((error) => {
        console.error('Seed error:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

