import { AppError } from "../api/errors.js";
import type { UtilizationFilter } from "../services/report.service.js";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Парсинг необязательных параметров диапазона: from, to (ISO-дата). */
export function parseUtilizationFilter(query: Record<string, unknown>): UtilizationFilter {
    const filter: UtilizationFilter = {};

    if (query.from !== undefined) {
        if (typeof query.from !== "string" || isNaN(new Date(query.from).getTime())) {
            throw new AppError("Invalid from date", 400);
        }

        filter.from = new Date(query.from);
    }

    if (query.to !== undefined) {
        if (typeof query.to !== "string" || isNaN(new Date(query.to).getTime())) {
            throw new AppError("Invalid to date", 400);
        }

        filter.to = new Date(query.to);
    }

    if (filter.from && filter.to && filter.to.getTime() <= filter.from.getTime()) {
        throw new AppError("Invalid date range", 400);
    }

    return filter;
}

export function validateReportBody(body: unknown): { from?: Date; to?: Date } {
    return parseUtilizationFilter(isRecord(body) ? body : {});
}
