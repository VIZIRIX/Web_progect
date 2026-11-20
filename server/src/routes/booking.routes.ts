
import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken, USER_ROLES } from '../middleware/auth.middleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

// Получение списка сотрудников для приглашения
router.get('/users', verifyToken, async (_req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                department: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return res.status(200).json({
            status: 'success',
            users
        });
    } catch (error) {
        console.error('Error fetching users:', error);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

router.get('/', verifyToken, async (req: Request, res: Response) => {
    try {
        const { from, to } = req.query;

        // Даты должны передаваться одновременно
        if ((from && !to) || (!from && to)) {
            return res.status(400).json({
                error: 'Both from and to dates are required'
            });
        }

        let dateFilter = {};

        if (from && to) {
            if (typeof from !== 'string' || typeof to !== 'string') {
                return res.status(400).json({
                    error: 'Invalid date parameters'
                });
            }

            const start = new Date(from);
            const end = new Date(to);

            if (
                isNaN(start.getTime()) ||
                isNaN(end.getTime()) ||
                end <= start
            ) {
                return res.status(400).json({
                    error: 'Invalid date range'
                });
            }

            dateFilter = {
                startTime: { lt: end },
                endTime: { gt: start }
            };
        }

        const bookings = await prisma.booking.findMany({
            where: dateFilter,
            include: {
                room: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                startTime: 'asc'
            }
        });

        return res.status(200).json({
            status: 'success',
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

router.post('/', verifyToken, async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const {
    roomId,
    startTime,
    endTime,
    title,
    participantIds
} = req.body;

    // Проверка пользователя
    if (!userId) {
        return res.status(401).json({
            error: 'User is not authorized'
        });
    }

    const parsedParticipantIds: number[] = [];

if (participantIds !== undefined) {
    if (!Array.isArray(participantIds)) {
        return res.status(400).json({
            error: 'Participant IDs must be an array'
        });
    }

    for (const id of participantIds) {
        const parsedId = Number(id);

        if (!Number.isInteger(parsedId) || parsedId <= 0) {
            return res.status(400).json({
                error: 'Invalid participant ID'
            });
        }

        if (parsedId !== userId && !parsedParticipantIds.includes(parsedId)) {
            parsedParticipantIds.push(parsedId);
        }
    }
}

    // Проверка входных данных
    const parsedRoomId = Number(roomId);
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
        !Number.isInteger(parsedRoomId) ||
        parsedRoomId <= 0 ||
        !title?.trim() ||
        !startTime ||
        !endTime ||
        isNaN(start.getTime()) ||
        isNaN(end.getTime()) ||
        end <= start
    ) {
        return res.status(400).json({
            error: 'Invalid booking data'
        });
    }

    try {
        const booking = await prisma.$transaction(async (tx) => {

        await tx.$queryRaw`
            WITH lock_result AS MATERIALIZED (
                SELECT pg_advisory_xact_lock(
                    74123::integer,
                    ${parsedRoomId}::integer
            )
        )
        SELECT 1::integer AS locked
        FROM lock_result
    `;

            // Проверяем существование комнаты
            const room = await tx.room.findUnique({
                where: { id: parsedRoomId }
            });

            if (!room) {
                throw new Error('ROOM_NOT_FOUND');
            }

            // Проверяем блокировку комнаты
            if (room.isBlocked) {
                throw new Error('ROOM_BLOCKED');
            }

            // Проверяем существование всех приглашённых сотрудников
            if (parsedParticipantIds.length > 0) {
    const existingUsers = await tx.user.findMany({
        where: {
            id: {
                in: parsedParticipantIds
            }
        },
        select: {
            id: true
        }
    });

    if (existingUsers.length !== parsedParticipantIds.length) {
        throw new Error('PARTICIPANT_NOT_FOUND');
    }
}

            // Проверяем пересечение времени
            const existingBooking = await tx.booking.findFirst({
                where: {
                    roomId: parsedRoomId,
                    startTime: { lt: end },
                    endTime: { gt: start }
                }
            });

            if (existingBooking) {
                throw new Error('TIME_CONFLICT');
            }

return await tx.booking.create({
    data: {
        title: title.trim(),
        startTime: start,
        endTime: end,
        roomId: parsedRoomId,
        userId: userId,

        participants: {
            create: parsedParticipantIds.map((participantId) => ({
                user: {
                    connect: {
                        id: participantId
                    }
                }
            }))
        }
    },
    include: {
        participants: {
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        }
    }
});
        });

        return res.status(201).json({
            status: 'success',
            message: 'Booking successfully created!',
            booking
        });

    } catch (error: any) {

        if (error instanceof Error && error.message === 'PARTICIPANT_NOT_FOUND') {
    return res.status(400).json({
        error: 'One or more participants do not exist'
    });
}
        if (error.message === 'ROOM_NOT_FOUND') {
            return res.status(404).json({
                error: 'Room not found'
            });
        }

        if (error.message === 'ROOM_BLOCKED') {
            return res.status(409).json({
                error: 'Room is blocked'
            });
        }

        if (error.message === 'TIME_CONFLICT') {
            return res.status(409).json({
                error: 'This room is already booked for the selected time'
            });
        }

        console.error('Error creating booking:', error);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});


router.patch('/:id', verifyToken, async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const bookingId = Number(req.params.id);
    const { startTime, endTime } = req.body;

    // Проверка авторизации
    if (!userId) {
        return res.status(401).json({
            error: 'User is not authorized'
        });
    }

    // Проверка ID бронирования
    if (!Number.isInteger(bookingId) || bookingId <= 0) {
        return res.status(400).json({
            error: 'Invalid booking ID'
        });
    }

    // Проверка даты и времени
    if (
        typeof startTime !== 'string' ||
        typeof endTime !== 'string'
    ) {
        return res.status(400).json({
            error: 'Start time and end time are required'
        });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
        isNaN(start.getTime()) ||
        isNaN(end.getTime()) ||
        end <= start
    ) {
        return res.status(400).json({
            error: 'Invalid date range'
        });
    }

    try {
        const updatedBooking = await prisma.$transaction(async (tx) => {
            // Ищем бронирование
            const booking = await tx.booking.findUnique({
                where: { id: bookingId }
            });

            if (!booking) {
                throw new Error('BOOKING_NOT_FOUND');
            }

            // Любая роль может перенести только свою встречу
            if (booking.userId !== userId) {
                throw new Error('FORBIDDEN');
            }

            // Блокируем комнату на время проверки
await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(
        74123::integer,
        ${booking.roomId}::integer
    )
`;

            // Проверяем комнату
            const room = await tx.room.findUnique({
                where: { id: booking.roomId }
            });

            if (!room || room.isBlocked) {
                throw new Error('ROOM_BLOCKED');
            }

            // Проверяем пересечение с другими бронированиями
            const conflictingBooking = await tx.booking.findFirst({
                where: {
                    id: { not: bookingId },
                    roomId: booking.roomId,
                    startTime: { lt: end },
                    endTime: { gt: start }
                }
            });

            if (conflictingBooking) {
                throw new Error('TIME_CONFLICT');
            }

            // Меняем только дату и время
            return await tx.booking.update({
                where: { id: bookingId },
                data: {
                    startTime: start,
                    endTime: end
                },
                include: {
                    room: true
                }
            });
        });

        return res.status(200).json({
            status: 'success',
            message: 'Booking successfully rescheduled',
            booking: updatedBooking
        });

    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'BOOKING_NOT_FOUND') {
                return res.status(404).json({
                    error: 'Booking not found'
                });
            }

            if (error.message === 'FORBIDDEN') {
                return res.status(403).json({
                    error: 'You can only reschedule your own bookings'
                });
            }

            if (error.message === 'ROOM_BLOCKED') {
                return res.status(409).json({
                    error: 'Room is blocked'
                });
            }

            if (error.message === 'TIME_CONFLICT') {
                return res.status(409).json({
                    error: 'This room is already booked for the selected time'
                });
            }
        }

        console.error('Error rescheduling booking:', error);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

router.delete('/:id', verifyToken, async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const userRole = req.user?.role;
    const bookingId = Number(req.params.id);

    // Проверяем авторизацию и ID
    if (!userId) {
        return res.status(401).json({
            error: 'User is not authorized'
        });
    }

    if (!Number.isInteger(bookingId) || bookingId <= 0) {
        return res.status(400).json({
            error: 'Invalid booking ID'
        });
    }

    try {
        // Ищем бронирование
        const booking = await prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) {
            return res.status(404).json({
                error: 'Booking not found'
            });
        }

        // Проверяем права пользователя
        const isManager =
            userRole === USER_ROLES.OFFICE_MANAGER ||
            userRole === USER_ROLES.ADMIN;

        if (!isManager && userRole !== USER_ROLES.EMPLOYEE) {
            return res.status(403).json({
                error: 'Insufficient permissions'
            });
        }

        if (!isManager && booking.userId !== userId) {
            return res.status(403).json({
                error: 'You can only cancel your own bookings'
            });
        }

        // Удаляем участников и бронирование в одной транзакции
        await prisma.$transaction(async (tx) => {
            await tx.bookingParticipant.deleteMany({
                where: { bookingId }
            });

            await tx.booking.delete({
                where: { id: bookingId }
            });
        });

        return res.status(200).json({
            status: 'success',
            message: 'Booking successfully cancelled'
        });

    } catch (error) {
        console.error('Error cancelling booking:', error);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

export default router;
