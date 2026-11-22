import { AppError } from '../api/errors.js';

export interface NormalizedCreateBooking {
    userId: number;
    roomId: number;
    title: string;
    start: Date;
    end: Date;
    participantIds: number[];
    isRecurring: boolean;
    recurrenceCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value);
}

function parsePositiveInt(value: unknown, message: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
        throw new AppError(message, 400);
    }

    return value;
}

function parseDate(value: unknown, message: string): Date {
    if (typeof value !== 'string') {
        throw new AppError(message, 400);
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
        throw new AppError(message, 400);
    }

    return date;
}

function parseParticipantIds(value: unknown, actorId: number): number[] {
    if (value === undefined) {
        return [];
    }

    if (!Array.isArray(value)) {
        throw new AppError('Participant IDs must be an array', 400);
    }

    const ids: number[] = [];

    for (const item of value) {
        if (typeof item !== 'number' || !Number.isSafeInteger(item) || item <= 0) {
            throw new AppError('Invalid participant ID', 400);
        }

        if (item !== actorId && !ids.includes(item)) {
            ids.push(item);
        }
    }

    return ids;
}

/** Парсинг параметров `from`/`to` в GET /api/bookings. */
export function parseDateRangeQuery(
    query: Record<string, unknown>
): { from?: Date; to?: Date } {
    const fromStr = typeof query.from === 'string' ? query.from : undefined;
    const toStr = typeof query.to === 'string' ? query.to : undefined;

    if ((!fromStr && toStr) || (fromStr && !toStr)) {
        throw new AppError('Both from and to dates are required', 400);
    }

    if (fromStr && toStr) {
        const start = new Date(fromStr);
        const end = new Date(toStr);

        if (
            isNaN(start.getTime()) ||
            isNaN(end.getTime()) ||
            end.getTime() <= start.getTime()
        ) {
            throw new AppError('Invalid date range', 400);
        }

        return { from: start, to: end };
    }

    return {};
}

export function parseBookingIdParam(value: unknown): number {
    if (typeof value !== 'string') {
        throw new AppError('Invalid booking ID', 400);
    }

    return parsePositiveInt(Number(value), 'Invalid booking ID');
}

export function validateCreateBookingInput(
    body: unknown,
    actorId: number
): NormalizedCreateBooking {
    if (!isRecord(body)) {
        throw new AppError('Invalid booking data', 400);
    }

    const roomId = parsePositiveInt(body.roomId, 'Invalid room ID');

    const title = typeof body.title === 'string' ? body.title.trim() : '';

    if (!title) {
        throw new AppError('Invalid booking data', 400);
    }

    const start = parseDate(body.startTime, 'Invalid booking data');
    const end = parseDate(body.endTime, 'Invalid booking data');

    if (end.getTime() <= start.getTime()) {
        throw new AppError('Invalid booking data', 400);
    }

    if (body.isRecurring !== undefined && typeof body.isRecurring !== 'boolean') {
        throw new AppError('Invalid recurring setting', 400);
    }

    const isRecurring = body.isRecurring === true;

    let recurrenceCount = 1;

    if (isRecurring) {
        const rawCount = body.recurrenceCount;

        if (
            typeof rawCount !== 'number' ||
            !Number.isSafeInteger(rawCount) ||
            rawCount < 2 ||
            rawCount > 52
        ) {
            throw new AppError(
                'Recurring bookings must contain 2 to 52 meetings',
                400
            );
        }

        recurrenceCount = rawCount;
    }

    return {
        userId: actorId,
        roomId,
        title,
        start,
        end,
        participantIds: parseParticipantIds(body.participantIds, actorId),
        isRecurring,
        recurrenceCount
    };
}

export function validateRescheduleInput(body: unknown): {
    start: Date;
    end: Date;
} {
    if (!isRecord(body)) {
        throw new AppError('Start time and end time are required', 400);
    }

    const start = parseDate(body.startTime, 'Start time and end time are required');
    const end = parseDate(body.endTime, 'Start time and end time are required');

    if (end.getTime() <= start.getTime()) {
        throw new AppError('Invalid date range', 400);
    }

    return { start, end };
}
