import { prisma } from "../db.js";

export interface UtilizationFilter {
    from?: Date;
    to?: Date;
}

export interface RoomUtilization {
    roomId: number;
    roomName: string;
    capacity: number;
    isBlocked: boolean;
    totalBookings: number;
    busyMs: number;
    freeMs: number;
    utilizationPercent: number;
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function nextMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/**
 * Звіт завантаженості кімнат: по кожній кімнаті — кількість бронювань,
 * сумарний зайнятий час і частка зайнятості відносно відпрацьованого періоду.
 * Діапазон: from..to, по замовчуванню — поточний місяць (локальний час).
 */
export async function getRoomUtilization(
    filter: UtilizationFilter,
): Promise<RoomUtilization[]> {
    const from = filter.from ?? startOfMonth(new Date());
    const to = filter.to ?? nextMonthStart(new Date());
    const spanMs = to.getTime() - from.getTime();

    if (spanMs <= 0) {
        return [];
    }

    const rooms = await prisma.room.findMany({
        select: { id: true, name: true, capacity: true, isBlocked: true },
        orderBy: { name: "asc" },
    });

    const bookings = await prisma.booking.findMany({
        where: { startTime: { lt: to }, endTime: { gt: from } },
        select: { roomId: true, startTime: true, endTime: true },
    });

    const busyByRoom = new Map<number, number>();
    const countByRoom = new Map<number, number>();

    for (const booking of bookings) {
        const busy = Math.max(
            0,
            Math.min(booking.endTime.getTime(), to.getTime()) -
                Math.max(booking.startTime.getTime(), from.getTime()),
        );

        if (busy <= 0) {
            continue;
        }

        busyByRoom.set(booking.roomId, (busyByRoom.get(booking.roomId) ?? 0) + busy);
        countByRoom.set(booking.roomId, (countByRoom.get(booking.roomId) ?? 0) + 1);
    }

    return rooms
        .map((room) => {
            const busyMs = busyByRoom.get(room.id) ?? 0;
            const totalBookings = countByRoom.get(room.id) ?? 0;

            return {
                roomId: room.id,
                roomName: room.name,
                capacity: room.capacity,
                isBlocked: room.isBlocked,
                totalBookings,
                busyMs,
                freeMs: Math.max(0, spanMs - busyMs),
                utilizationPercent: busyMs > 0 ? Math.round((busyMs / spanMs) * 1000) / 10 : 0,
            };
        })
        .sort((a, b) => b.utilizationPercent - a.utilizationPercent || a.roomName.localeCompare(b.roomName));
}
