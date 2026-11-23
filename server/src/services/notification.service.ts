import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';

/**
 * Формат дати та часу для повідомлень (наприклад "23.11.2026, 09:00").
 */
function formatBookingStart(startTime: Date): string {
    const formatter = new Intl.DateTimeFormat('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return formatter.format(startTime);
}

/**
 * Створює уведомлення о скасуванні броні (вызывается внутри транзакцію).
 * Учасники та організатор отримують уведомлення — список з одержувачів.
 * Повідомлення містить тему бронювання, назву кімнати, дату бронювання
 * та ім'я того, хто скасував бронь.
 */
export async function notifyBookingCancelled(
    tx: Prisma.TransactionClient,
    booking: {
        id: number;
        title: string;
        roomName: string;
        startTime: Date;
        cancellerName: string;
    },
    recipientIds: number[]
): Promise<number> {
    if (recipientIds.length === 0) {
        return 0;
    }

    const message =
        `Ваша бронь «${booking.title}» (комната: ${booking.roomName}, ` +
        `дата: ${formatBookingStart(booking.startTime)}) ` +
        `была отменена пользователем ${booking.cancellerName}.`;

    const result = await tx.notification.createMany({
        data: recipientIds.map(userId => ({
            userId,
            type: 'booking_cancelled',
            message,
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
