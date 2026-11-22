import { AppError } from "../api/errors.js";

export interface SettingsUpdateInput {
    workStart: string;
    workEnd: string;
    maxBookingHours: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMinutes(value: string): number {
    return Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
}

export function validateSettingsUpdate(body: unknown): SettingsUpdateInput {
    if (
        !isRecord(body) ||
        typeof body.workStart !== "string" ||
        typeof body.workEnd !== "string" ||
        !timePattern.test(body.workStart) ||
        !timePattern.test(body.workEnd)
    ) {
        throw new AppError("Invalid working hours", 400);
    }

    const startMinutes = toMinutes(body.workStart);
    const endMinutes = toMinutes(body.workEnd);

    if (
        endMinutes <= startMinutes ||
        typeof body.maxBookingHours !== "number" ||
        !Number.isSafeInteger(body.maxBookingHours) ||
        body.maxBookingHours < 1 ||
        body.maxBookingHours > 12
    ) {
        throw new AppError("Invalid settings values", 400);
    }

    return {
        workStart: body.workStart,
        workEnd: body.workEnd,
        maxBookingHours: body.maxBookingHours,
    };
}
