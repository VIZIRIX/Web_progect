import { describe, expect, it } from "vitest";

import { AppError } from "../api/errors.js";
import {
    parseBookingIdParam,
    parseBookingsListQuery,
    parseDateRangeQuery,
    validateCreateBookingInput,
    validateRescheduleInput,
} from "./booking.validators.js";

describe("validateCreateBookingInput", () => {
    const actorId = 42;
    const base = {
        roomId: 1,
        title: "Planning",
        startTime: "2026-06-02T09:00:00Z",
        endTime: "2026-06-02T10:00:00Z",
    };

    it("normalizes valid input", () => {
        const result = validateCreateBookingInput({ ...base }, actorId);

        expect(result).toEqual({
            userId: actorId,
            roomId: 1,
            title: "Planning",
            start: new Date(base.startTime),
            end: new Date(base.endTime),
            participantIds: [],
            isRecurring: false,
            recurrenceCount: 1,
        });
    });

    it("rejects missing/invalid room", () => {
        expect(() => validateCreateBookingInput({ ...base, roomId: 0 }, actorId)).toThrow(AppError);
        expect(() => validateCreateBookingInput({ ...base, roomId: "abc" }, actorId)).toThrow(
            AppError,
        );
    });

    it("rejects empty title and invalid dates", () => {
        expect(() => validateCreateBookingInput({ ...base, title: "   " }, actorId)).toThrow(
            AppError,
        );
        expect(() => validateCreateBookingInput({ ...base, startTime: "nope" }, actorId)).toThrow(
            AppError,
        );
    });

    it("rejects end before start", () => {
        expect(() =>
            validateCreateBookingInput(
                { ...base, startTime: "2026-06-02T10:00:00Z", endTime: "2026-06-02T09:00:00Z" },
                actorId,
            ),
        ).toThrow(AppError);
    });

    it("parses recurring bookings (2–52) and dedupes participants (without actor)", () => {
        const result = validateCreateBookingInput(
            {
                ...base,
                isRecurring: true,
                recurrenceCount: 7,
                participantIds: [7, 7, actorId, 8],
            },
            actorId,
        );

        expect(result.isRecurring).toBe(true);
        expect(result.recurrenceCount).toBe(7);
        expect(result.participantIds).toEqual([7, 8]);
    });

    it("rejects invalid recurrenceCount", () => {
        expect(() =>
            validateCreateBookingInput({ ...base, isRecurring: true, recurrenceCount: 1 }, actorId),
        ).toThrow(AppError);
        expect(() =>
            validateCreateBookingInput(
                { ...base, isRecurring: true, recurrenceCount: 53 },
                actorId,
            ),
        ).toThrow(AppError);
        expect(() => validateCreateBookingInput({ ...base, isRecurring: true }, actorId)).toThrow(
            AppError,
        );
    });
});

describe("validateRescheduleInput", () => {
    it("parses valid start/end", () => {
        const result = validateRescheduleInput({
            startTime: "2026-06-05T09:00:00Z",
            endTime: "2026-06-05T11:00:00Z",
        });

        expect(result.start).toEqual(new Date("2026-06-05T09:00:00Z"));
        expect(result.end).toEqual(new Date("2026-06-05T11:00:00Z"));
    });

    it("rejects missing fields or end <= start", () => {
        expect(() => validateRescheduleInput({})).toThrow(AppError);
        expect(() => validateRescheduleInput({ startTime: "a", endTime: "b" })).toThrow(AppError);
        expect(() =>
            validateRescheduleInput({
                startTime: "2026-06-05T11:00:00Z",
                endTime: "2026-06-05T10:00:00Z",
            }),
        ).toThrow(AppError);
    });
});

describe("parseBookingIdParam", () => {
    it("parses positive int", () => {
        expect(parseBookingIdParam("42")).toBe(42);
        expect(() => parseBookingIdParam("abc")).toThrow(AppError);
        expect(() => parseBookingIdParam("0")).toThrow(AppError);
    });
});

describe("parseDateRangeQuery", () => {
    it("accepts both from and to", () => {
        const range = parseDateRangeQuery({
            from: "2026-06-01T00:00:00Z",
            to: "2026-06-30T00:00:00Z",
        });

        expect(range.from).toEqual(new Date("2026-06-01T00:00:00Z"));
        expect(range.to).toEqual(new Date("2026-06-30T00:00:00Z"));
    });

    it("rejects only one of from/to or invalid range", () => {
        expect(() => parseDateRangeQuery({ from: "2026-06-01T00:00:00Z" })).toThrow(AppError);
        expect(() => parseDateRangeQuery({ to: "2026-06-30T00:00:00Z" })).toThrow(AppError);
        expect(() =>
            parseDateRangeQuery({
                from: "2026-06-30T00:00:00Z",
                to: "2026-06-01T00:00:00Z",
            }),
        ).toThrow(AppError);
    });
});

describe("parseBookingsListQuery", () => {
    it("parses limit/offset/sort", () => {
        expect(parseBookingsListQuery({ limit: "20", offset: "40", sort: "-startTime" })).toEqual({
            limit: 20,
            offset: 40,
            sort: "-startTime",
        });
    });

    it("rejects invalid limit/offset/sort", () => {
        expect(() => parseBookingsListQuery({ limit: "0" })).toThrow(AppError);
        expect(() => parseBookingsListQuery({ limit: "101" })).toThrow(AppError);
        expect(() => parseBookingsListQuery({ limit: "x" })).toThrow(AppError);
        expect(() => parseBookingsListQuery({ offset: "-1" })).toThrow(AppError);
        expect(() => parseBookingsListQuery({ sort: "nope" })).toThrow(AppError);
    });

    it("defaults to empty filter", () => {
        expect(parseBookingsListQuery({})).toEqual({});
    });
});
