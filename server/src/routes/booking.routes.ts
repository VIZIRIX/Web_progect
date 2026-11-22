
import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { verifyToken, USER_ROLES } from '../middleware/auth.middleware.js';
import { randomUUID } from 'node:crypto';

const router: Router = Router();
const prisma = new PrismaClient();


// Проверка рабочих часов и максимальной длительности встречи
function validateBookingTime(
    start: Date,
    end: Date,
    settings: {
        workStart: string;
        workEnd: string;
        maxBookingHours: number;
    }
): string | null {
    const timezone = 'Europe/Kyiv';

    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    });

    const startParts = formatter.formatToParts(start);
    const endParts = formatter.formatToParts(end);

    const getPart = (
        parts: Intl.DateTimeFormatPart[],
        type: string
    ) => parts.find(part => part.type === type)?.value;

    const startDate = [
        getPart(startParts, 'year'),
        getPart(startParts, 'month'),
        getPart(startParts, 'day')
    ].join('-');

    const endDate = [
        getPart(endParts, 'year'),
        getPart(endParts, 'month'),
        getPart(endParts, 'day')
    ].join('-');

    if (startDate !== endDate) {
        return 'Booking must start and end on the same working day';
    }

    const startMinutes =
        Number(getPart(startParts, 'hour')) * 60 +
        Number(getPart(startParts, 'minute'));

    const endMinutes =
        Number(getPart(endParts, 'hour')) * 60 +
        Number(getPart(endParts, 'minute'));

    const workStart =
        Number(settings.workStart.slice(0, 2)) * 60 +
        Number(settings.workStart.slice(3, 5));

    const workEnd =
        Number(settings.workEnd.slice(0, 2)) * 60 +
        Number(settings.workEnd.slice(3, 5));

    if (
        startMinutes < workStart ||
        endMinutes > workEnd
    ) {
        return 'Booking is outside working hours';
    }

    const durationMinutes =
        (end.getTime() - start.getTime()) / 60000;

    if (durationMinutes > settings.maxBookingHours * 60) {
        return 'Booking exceeds maximum duration';
    }

    return null;
}


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

    if (!userId) {
        return res.status(401).json({
            error: 'User is not authorized'
        });
    }

    const {
        roomId,
        startTime,
        endTime,
        title,
        participantIds,
        isRecurring,
        recurrenceCount
    } = req.body;

    const parsedRoomId = Number(roomId);
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
        !Number.isInteger(parsedRoomId) ||
        parsedRoomId <= 0 ||
        typeof title !== 'string' ||
        !title.trim() ||
        typeof startTime !== 'string' ||
        typeof endTime !== 'string' ||
        isNaN(start.getTime()) ||
        isNaN(end.getTime()) ||
        end <= start
    ) {
        return res.status(400).json({
            error: 'Invalid booking data'
        });
    }

    if (
        isRecurring !== undefined &&
        typeof isRecurring !== 'boolean'
    ) {
        return res.status(400).json({
            error: 'Invalid recurring setting'
        });
    }

    const recurring = isRecurring === true;
    const count = recurring ? Number(recurrenceCount) : 1;

    if (
        !Number.isInteger(count) ||
        count < 1 ||
        count > 52 ||
        (recurring && count < 2)
    ) {
        return res.status(400).json({
            error: 'Recurring bookings must contain 2 to 52 meetings'
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

            if (
                parsedId !== userId &&
                !parsedParticipantIds.includes(parsedId)
            ) {
                parsedParticipantIds.push(parsedId);
            }
        }
    }

    const seriesId = recurring ? randomUUID() : null;

    try {
        const bookings = await prisma.$transaction(async (tx) => {
            // Блокируем комнату на время проверки и создания
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

            const room = await tx.room.findUnique({
                where: { id: parsedRoomId }
            });

            if (!room) {
                throw new Error('ROOM_NOT_FOUND');
            }

            if (room.isBlocked) {
                throw new Error('ROOM_BLOCKED');
            }

            // Загружаем системные ограничения из PostgreSQL
            const settings = await tx.systemSettings.upsert({
                where: { id: 1 },
                update: {},
                create: { id: 1 }
            });

            // Проверяем существование участников
            if (parsedParticipantIds.length > 0) {
                const existingUsers = await tx.user.findMany({
                    where: {
                        id: { in: parsedParticipantIds }
                    },
                    select: { id: true }
                });

                if (
                    existingUsers.length !== parsedParticipantIds.length
                ) {
                    throw new Error('PARTICIPANT_NOT_FOUND');
                }
            }

            const createdBookings = [];

            for (let i = 0; i < count; i++) {
                // Каждая следующая встреча через 7 дней
                const occurrenceStart = new Date(
                    start.getTime() + i * 7 * 24 * 60 * 60 * 1000
                );

                const occurrenceEnd = new Date(
                    end.getTime() + i * 7 * 24 * 60 * 60 * 1000
                );

                // Проверяем рабочее время и максимальную длительность
                const timeError = validateBookingTime(
                    occurrenceStart,
                    occurrenceEnd,
                    settings
                );

                if (timeError === 'Booking exceeds maximum duration') {
                    throw new Error('MAX_DURATION_EXCEEDED');
                }

                if (timeError) {
                    throw new Error('OUTSIDE_WORKING_HOURS');
                }

                // Проверяем пересечение для каждой даты
                const conflict = await tx.booking.findFirst({
                    where: {
                        roomId: parsedRoomId,
                        startTime: { lt: occurrenceEnd },
                        endTime: { gt: occurrenceStart }
                    }
                });

                if (conflict) {
                    throw new Error('TIME_CONFLICT');
                }

                const booking = await tx.booking.create({
                    data: {
                        title: title.trim(),
                        startTime: occurrenceStart,
                        endTime: occurrenceEnd,
                        roomId: parsedRoomId,
                        userId,
                        isRecurring: recurring,
                        seriesId,
                        participants: {
                            create: parsedParticipantIds.map(
                                (participantId) => ({
                                    user: {
                                        connect: { id: participantId }
                                    }
                                })
                            )
                        }
                    }
                });

                createdBookings.push(booking);
            }

            return createdBookings;
        });

        return res.status(201).json({
            status: 'success',
            message: recurring
                ? 'Recurring bookings successfully created'
                : 'Booking successfully created',
            count: bookings.length,
            bookings
        });

    } catch (error) {
        if (error instanceof Error) {
            if (error.message === 'PARTICIPANT_NOT_FOUND') {
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
                    error: 'One of the recurring meetings conflicts with another booking'
                });
            }

            if (error.message === 'OUTSIDE_WORKING_HOURS') {
                return res.status(400).json({
                    error: 'Booking must be within working hours and on the same working day'
                });
            }

            if (error.message === 'MAX_DURATION_EXCEEDED') {
                return res.status(400).json({
                    error: 'Booking exceeds maximum duration'
                });
            }
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

            const isManager =
                req.user?.role === USER_ROLES.OFFICE_MANAGER ||
                req.user?.role === USER_ROLES.ADMIN;

            if (!isManager && booking.userId !== userId) {
                throw new Error('FORBIDDEN');
            }

            // Блокируем комнату на время проверки
            await tx.$queryRaw`
                WITH lock_result AS MATERIALIZED (
                    SELECT pg_advisory_xact_lock(
                        74123::integer,
                        ${booking.roomId}::integer
                    )
                )
                SELECT 1::integer AS locked
                FROM lock_result
            `;

            // Проверяем комнату
            const room = await tx.room.findUnique({
                where: { id: booking.roomId }
            });

            if (!room || room.isBlocked) {
                throw new Error('ROOM_BLOCKED');
            }

            // Загружаем системные ограничения и проверяем новое время
            const settings = await tx.systemSettings.upsert({
                where: { id: 1 },
                update: {},
                create: { id: 1 }
            });

            const timeError = validateBookingTime(start, end, settings);

            if (timeError === 'Booking exceeds maximum duration') {
                throw new Error('MAX_DURATION_EXCEEDED');
            }

            if (timeError) {
                throw new Error('OUTSIDE_WORKING_HOURS');
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

            if (error.message === 'OUTSIDE_WORKING_HOURS') {
                return res.status(400).json({
                    error: 'Booking must be within working hours and on the same working day'
                });
            }

            if (error.message === 'MAX_DURATION_EXCEEDED') {
                return res.status(400).json({
                    error: 'Booking exceeds maximum duration'
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
