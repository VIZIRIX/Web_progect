import { AppError } from '../api/errors.js';

export function parseNotificationIdParam(value: unknown): number {
    const notificationId = typeof value === 'string' ? Number(value) : NaN;

    if (!Number.isSafeInteger(notificationId) || notificationId <= 0) {
        throw new AppError('Invalid notification ID', 400);
    }

    return notificationId;
}

export function parseNotificationListQuery(
    query: Record<string, unknown>
): { limit?: number | undefined; offset?: number | undefined } {
    const limit = typeof query.limit === 'string' ? Number(query.limit) : undefined;

    if (limit !== undefined && (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)) {
        throw new AppError('Invalid limit', 400);
    }

    const offset =
        typeof query.offset === 'string' ? Number(query.offset) : undefined;

    if (offset !== undefined && (!Number.isSafeInteger(offset) || offset < 0)) {
        throw new AppError('Invalid offset', 400);
    }

    return { limit, offset };
}
