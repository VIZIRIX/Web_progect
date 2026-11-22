import { randomUUID } from "node:crypto";
import type { Booking, Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { AppError } from "../api/errors.js";
import { isManager, type UserRole } from "../middleware/auth.middleware.js";
import { validateBookingTime } from "../utils/booking.utils.js";
import type {
    BookingsListFilter,
    NormalizedCreateBooking,
} from "../validators/booking.validators.js";

const LOCK_NAMESPACE = 74123;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Блокировка комнаты на время транзакции, чтобы параллельные запросы
 * не записывали пересекающиеся брони.
 */
async function lockRoomForUpdate(tx: Prisma.TransactionClient, roomId: number): Promise<void> {
    await tx.$queryRaw`
        WITH lock_result AS MATERIALIZED (
            SELECT pg_advisory_xact_lock(
                ${LOCK_NAMESPACE}::integer,
                ${roomId}::integer
            )
        )
        SELECT 1::integer AS locked
        FROM lock_result
    `;
}

async function loadSettings(tx: Prisma.TransactionClient) {
    return tx.systemSettings.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1 },
    });
}

function assertBookingTimeAllowed(timeError: string | null): void {
    if (timeError === "Booking exceeds maximum duration") {
        throw new AppError("Booking exceeds maximum duration", 400);
    }

    if (timeError) {
        throw new AppError("Booking must be within working hours and on the same working day", 400);
    }
}

function toWeekOffset(date: Date, offsetWeeks: number): Date {
    return new Date(date.getTime() + offsetWeeks * WEEK_MS);
}

export async function listBookings(filter: BookingsListFilter): Promise<{
    bookings: Booking[];
    totalCount: number;
}> {
    const where: Prisma.BookingWhereInput = {};

    if (filter.from && filter.to) {
        where.startTime = { lt: filter.to };
        where.endTime = { gt: filter.from };
    }

    const sortField = filter.sort === "-startTime" ? "startTime" : filter.sort;
    const sortDirection = filter.sort === "-startTime" ? "desc" : "asc";

    const findManyArgs: Prisma.BookingFindManyArgs = {
        where,
        include: {
            room: true,
            user: {
                select: { id: true, name: true, email: true },
            },
            participants: {
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                },
            },
        },
        orderBy: sortField
            ? ({ [sortField]: sortDirection } as Prisma.BookingOrderByWithRelationInput)
            : { startTime: "asc" },
    };

    if (filter.limit !== undefined) {
        findManyArgs.take = filter.limit;
    }

    if (filter.offset !== undefined) {
        findManyArgs.skip = filter.offset;
    }

    const [bookings, totalCount] = await Promise.all([
        prisma.booking.findMany(findManyArgs),
        prisma.booking.count({ where }),
    ]);

    return { bookings, totalCount };
}

export async function listUsers() {
    return prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            department: { select: { name: true } },
        },
        orderBy: { name: "asc" },
    });
}

export async function createBooking(input: NormalizedCreateBooking) {
    const seriesId = input.isRecurring ? randomUUID() : null;

    const bookings = await prisma.$transaction(async (tx) => {
        await lockRoomForUpdate(tx, input.roomId);

        const room = await tx.room.findUnique({
            where: { id: input.roomId },
            select: { isBlocked: true },
        });

        if (!room) {
            throw new AppError("Room not found", 404);
        }

        if (room.isBlocked) {
            throw new AppError("Room is blocked", 409);
        }

        const settings = await loadSettings(tx);

        if (input.participantIds.length > 0) {
            const existingUsers = await tx.user.findMany({
                where: { id: { in: input.participantIds } },
                select: { id: true },
            });

            if (existingUsers.length !== input.participantIds.length) {
                throw new AppError("One or more participants do not exist", 400);
            }
        }

        const created: Booking[] = [];

        for (let i = 0; i < input.recurrenceCount; i++) {
            const occurrenceStart = toWeekOffset(input.start, i);
            const occurrenceEnd = toWeekOffset(input.end, i);

            assertBookingTimeAllowed(validateBookingTime(occurrenceStart, occurrenceEnd, settings));

            const conflict = await tx.booking.findFirst({
                where: {
                    roomId: input.roomId,
                    startTime: { lt: occurrenceEnd },
                    endTime: { gt: occurrenceStart },
                },
            });

            if (conflict) {
                throw new AppError(
                    "One of the recurring meetings conflicts with another booking",
                    409,
                );
            }

            const booking = await tx.booking.create({
                data: {
                    title: input.title,
                    startTime: occurrenceStart,
                    endTime: occurrenceEnd,
                    roomId: input.roomId,
                    userId: input.userId,
                    isRecurring: input.isRecurring,
                    seriesId,
                    participants: {
                        create: input.participantIds.map((userId) => ({
                            user: { connect: { id: userId } },
                        })),
                    },
                },
            });

            created.push(booking);
        }

        return created;
    });

    return { bookings, recurring: input.isRecurring };
}

export async function rescheduleBooking(
    id: number,
    times: { start: Date; end: Date },
    opts: { actorId: number; isManager: boolean },
): Promise<Booking> {
    return prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({ where: { id } });

        if (!booking) {
            throw new AppError("Booking not found", 404);
        }

        if (!opts.isManager && booking.userId !== opts.actorId) {
            throw new AppError("You can only reschedule your own bookings", 403);
        }

        await lockRoomForUpdate(tx, booking.roomId);

        const room = await tx.room.findUnique({
            where: { id: booking.roomId },
            select: { isBlocked: true },
        });

        if (!room || room.isBlocked) {
            throw new AppError("Room is blocked", 409);
        }

        const settings = await loadSettings(tx);

        assertBookingTimeAllowed(validateBookingTime(times.start, times.end, settings));

        const conflict = await tx.booking.findFirst({
            where: {
                id: { not: id },
                roomId: booking.roomId,
                startTime: { lt: times.end },
                endTime: { gt: times.start },
            },
        });

        if (conflict) {
            throw new AppError("This room is already booked for the selected time", 409);
        }

        return tx.booking.update({
            where: { id },
            data: { startTime: times.start, endTime: times.end },
            include: { room: true },
        });
    });
}

export async function cancelBooking(
    id: number,
    opts: { actorId: number; role: UserRole },
): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({ where: { id } });

        if (!booking) {
            throw new AppError("Booking not found", 404);
        }

        if (!isManager(opts.role) && booking.userId !== opts.actorId) {
            throw new AppError("You can only cancel your own bookings", 403);
        }

        await tx.bookingParticipant.deleteMany({ where: { bookingId: id } });
        await tx.booking.delete({ where: { id } });
    });
}
