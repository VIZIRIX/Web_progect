import { describe, expect, it } from "vitest";

import { validateBookingTime } from "./booking.utils.js";

const settings = {
    workStart: "08:00",
    workEnd: "20:00",
    maxBookingHours: 4,
};

// Europe/Kyiv = UTC+3 в июне.
// Итого: UTC 05:00 → Kyiv 08:00; UTC 09:00 → Kyiv 12:00; UTC 10:00 → Kyiv 13:00.

describe("validateBookingTime", () => {
    it("accepts a booking inside working hours", () => {
        // Kyiv 12:00 – 13:00, частично пересекают 20:00 нет; внутри 08:00–20:00
        const start = new Date("2026-06-02T09:00:00Z");
        const end = new Date("2026-06-02T10:00:00Z");

        expect(validateBookingTime(start, end, settings)).toBeNull();
    });

    it("accepts start exactly at workStart and end within hours", () => {
        const start = new Date("2026-06-02T05:00:00Z"); // Kyiv 08:00 = workStart
        const end = new Date("2026-06-02T08:30:00Z"); // Kyiv 11:30, внутри и короче 4 ч

        expect(validateBookingTime(start, end, settings)).toBeNull();
    });

    it("accepts end exactly at workEnd", () => {
        const start = new Date("2026-06-02T16:00:00Z"); // Kyiv 19:00
        const end = new Date("2026-06-02T17:00:00Z"); // Kyiv 20:00 = workEnd

        expect(validateBookingTime(start, end, settings)).toBeNull();
    });

    it("rejects a booking starting before workStart", () => {
        const start = new Date("2026-06-02T04:30:00Z"); // Kyiv 07:30 < 08:00
        const end = new Date("2026-06-02T06:00:00Z"); // Kyiv 09:00

        expect(validateBookingTime(start, end, settings)).toBe("Booking is outside working hours");
    });

    it("rejects a booking ending after workEnd", () => {
        const start = new Date("2026-06-02T14:00:00Z"); // Kyiv 17:00
        const end = new Date("2026-06-02T18:00:00Z"); // Kyiv 21:00 > 20:00

        expect(validateBookingTime(start, end, settings)).toBe("Booking is outside working hours");
    });

    it("rejects bookings that cross midnight (different Kyiv dates)", () => {
        const start = new Date("2026-06-02T20:00:00Z"); // Kyiv 23:00 Jun2
        const end = new Date("2026-06-03T01:00:00Z"); // Kyiv 04:00 Jun3

        expect(validateBookingTime(start, end, settings)).toBe(
            "Booking must start and end on the same working day",
        );
    });

    it("rejects duration over maxBookingHours", () => {
        const start = new Date("2026-06-02T05:00:00Z"); // Kyiv 08:00
        const end = new Date("2026-06-02T10:30:00Z"); // Kyiv 13:30, 5.5 часов > 4

        expect(validateBookingTime(start, end, settings)).toBe("Booking exceeds maximum duration");
    });

    it("accepts duration equal to maxBookingHours", () => {
        const start = new Date("2026-06-02T05:00:00Z"); // Kyiv 08:00
        const end = new Date("2026-06-02T09:00:00Z"); // Kyiv 12:00, ровно 4 часа

        expect(validateBookingTime(start, end, settings)).toBeNull();
    });
});
