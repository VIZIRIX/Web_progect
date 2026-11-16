
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function requiredAt<T>(
    items: readonly T[],
    index: number,
    description: string
): T {
    const item = items[index];

    if (item === undefined) {
        throw new Error(`Missing ${description} at index ${index}`);
    }

    return item;
}

const departmentNames = [
    'Administration',
    'IT Department',
    'Accounting',
    'Human Resources',
    'Marketing',
    'Sales',
    'Legal Department',
    'Logistics',
    'Production',
    'Technical Department',
    'Customer Support',
    'Analytics Department'
];

const equipmentNames = [
    'Projector',
    'Interactive Whiteboard',
    'Television',
    'Video Conferencing System',
    'Webcam',
    'Microphone',
    'Audio System',
    'Laptop',
    'Desktop Computer',
    'Flip Chart',
    'Whiteboard',
    'Presentation System'
];

async function main(): Promise<void> {
    console.log('Starting database seeding...');

    const employeePasswordHash = await bcrypt.hash('Employee123!', 10);
    const managerPasswordHash = await bcrypt.hash('Manager123!', 10);
    const adminPasswordHash = await bcrypt.hash('superadmin123', 10);

    // 1. Departments
    const departments = [];

    for (const name of departmentNames) {
        const department = await prisma.department.upsert({
            where: { name },
            update: {},
            create: { name }
        });

        departments.push(department);
    }

    console.log(`Departments created: ${departments.length}`);

    const equipment = [];

    for (const name of equipmentNames) {
        const item = await prisma.equipment.upsert({
            where: { name },
            update: {},
            create: { name }
        });

        equipment.push(item);
    }

    console.log(`Equipment created: ${equipment.length}`);

    const adminDepartment = requiredAt(
        departments,
        0,
        'administrator department'
    );

    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            name: 'Administrator',
            email: 'admin@example.com',
            passwordHash: adminPasswordHash,
            role: 'admin',
            departmentId: adminDepartment.id
        }
    });

    const users = [admin];

    for (let i = 1; i <= 4; i++) {
        const department = requiredAt(
            departments,
            i,
            'manager department'
        );

        const manager = await prisma.user.upsert({
            where: { email: `manager${i}@example.com` },
            update: {},
            create: {
                name: `Office Manager ${i}`,
                email: `manager${i}@example.com`,
                passwordHash: managerPasswordHash,
                role: 'office_manager',
                departmentId: department.id
            }
        });

        users.push(manager);
    }

    for (let i = 1; i <= 95; i++) {
        const department = requiredAt(
            departments,
            (i % 11) + 1,
            'employee department'
        );

        const email = `employee${String(i).padStart(3, '0')}@example.com`;

        const employee = await prisma.user.upsert({
            where: { email },
            update: {},
            create: {
                name: `Employee ${i}`,
                email,
                passwordHash: employeePasswordHash,
                role: 'employee',
                departmentId: department.id
            }
        });

        users.push(employee);
    }

    console.log(`Users created: ${users.length}`);

    const rooms = [];

    for (let i = 1; i <= 25; i++) {
        const room = await prisma.room.upsert({
            where: { name: `Meeting Room ${i}` },
            update: {},
            create: {
                name: `Meeting Room ${i}`,
                capacity: 4 + (i % 9),
                isBlocked: false
            }
        });

        rooms.push(room);
    }

    console.log(`Rooms created: ${rooms.length}`);

    for (let i = 0; i < rooms.length; i++) {
        const room = requiredAt(rooms, i, 'room');
        const links = [];

        for (let j = 0; j < equipment.length; j++) {
            const item = requiredAt(equipment, j, 'equipment');

            if ((i + j) % 3 === 0 || j === i % equipment.length) {
                links.push({
                    roomId: room.id,
                    equipmentId: item.id
                });
            }
        }

        await prisma.roomEquipment.createMany({
            data: links,
            skipDuplicates: true
        });
    }

    await prisma.booking.deleteMany({
        where: {
            title: {
                startsWith: '[SEED]'
            }
        }
    });

    const workingDays: Date[] = [];
    const currentDate = new Date(Date.UTC(2026, 10, 16));

    while (workingDays.length < 60) {
        const day = currentDate.getUTCDay();

        if (day !== 0 && day !== 6) {
            workingDays.push(new Date(currentDate));
        }

        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    let bookingCount = 0;

    for (let dayIndex = 0; dayIndex < workingDays.length; dayIndex++) {
        const dayDate = requiredAt(
            workingDays,
            dayIndex,
            'working day'
        );

        for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
            const room = requiredAt(rooms, roomIndex, 'room');

            const date = new Date(dayDate);

            const isRecurring = roomIndex < 5;
            const weekday = dayIndex % 5;

            const hour = isRecurring
                ? 10 + roomIndex
                : 9 + ((roomIndex * 3 + dayIndex) % 8);

            date.setUTCHours(hour, 0, 0, 0);

            const endTime = new Date(date);
            endTime.setUTCHours(hour + 1);

            const organizer = requiredAt(
                users,
                (bookingCount * 7 + 5) % users.length,
                'booking organizer'
            );

            const availableParticipants = users.filter(
                user => user.id !== organizer.id
            );

            const participantIds = new Set<number>();

            for (let j = 0; j < 2; j++) {
                const participant = requiredAt(
                    availableParticipants,
                    (bookingCount * 11 + j * 13) %
                        availableParticipants.length,
                    'booking participant'
                );

                participantIds.add(participant.id);
            }

            await prisma.booking.create({
                data: {
                    title: isRecurring
                        ? `[SEED] Weekly Meeting ${roomIndex + 1}-${weekday + 1}`
                        : `[SEED] Business Meeting ${bookingCount + 1}`,

                    startTime: date,
                    endTime,
                    isRecurring,

                    seriesId: isRecurring
                        ? `weekly-room-${roomIndex + 1}-weekday-${weekday + 1}`
                        : null,

                    roomId: room.id,
                    userId: organizer.id,

                    participants: {
                        create: Array.from(participantIds).map(userId => ({
                            user: {
                                connect: { id: userId }
                            }
                        }))
                    }
                }
            });

            bookingCount++;
        }
    }

    console.log(`Bookings created: ${bookingCount}`);
    console.log('Database seeding completed successfully!');
}

main()
    .catch((error: unknown) => {
        console.error('Seeding failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


