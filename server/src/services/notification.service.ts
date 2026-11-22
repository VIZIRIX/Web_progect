import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

/**
 * Создаёт уведомления о скасуванні броні (вызывается внутри транзакции).
 * Участники и организатор получают уведомление — список из получателей.
 */
export async function notifyBookingCancelled(
    tx: Prisma.TransactionClient,
    booking: {
        id: number;
        title: string;
        roomName: string;
    },
    recipientIds: number[]
): Promise<number> {
    if (recipientIds.length === 0) {
        return 0;
    }

    const result = await tx.notification.createMany({
        data: recipientIds.map(userId => ({
            userId,
            type: 'booking_cancelled',
            message: `Ваша бронь «${booking.title}» (комната: ${booking.roomName}) была отменена.`,
            bookingId: booking.id
        })),
        skipDuplicates: true
    });

    return result.count;
}

export async function listNotifications(
    userId: number,
    filter: { limit?: number | undefined; offset?: number | undefined } = {}
) {
    const findManyArgs: Prisma.NotificationFindManyArgs = {
        where: { userId },
        orderBy: { createdAt: 'desc' }
    };

    if (filter.limit !== undefined) {
        findManyArgs.take = filter.limit;
    }

    if (filter.offset !== undefined) {
        findManyArgs.skip = filter.offset;
    }

    return prisma.notification.findMany(findManyArgs);
}

/** Помечает уведомление как прочитанное. Возвращает {count} (0, если чужое). */
export async function markAsRead(
    userId: number,
    notificationId: number
): Promise<{ count: number }> {
    return prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true }
    });
}
