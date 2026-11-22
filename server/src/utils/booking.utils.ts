/**
 * Список ограничений системы, взятых из настроек (SystemSettings).
 */
export interface WorkHours {
    workStart: string;
    workEnd: string;
    maxBookingHours: number;
}

/**
 * Проверяет, что встреча помещается в рабочее время и не превышает максимальную тривалость.
 * Возвращает null, если ок, или текст ошибки.
 * Время валидации — Киев (Europe/Kyiv).
 */
export function validateBookingTime(
    start: Date,
    end: Date,
    settings: WorkHours
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
