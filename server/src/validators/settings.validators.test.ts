import { describe, expect, it } from "vitest";

import { AppError } from "../api/errors.js";
import { validateSettingsUpdate } from "./settings.validators.js";

describe("validateSettingsUpdate", () => {
    it("accepts valid values", () => {
        expect(
            validateSettingsUpdate({
                workStart: "08:00",
                workEnd: "20:00",
                maxBookingHours: 6,
            }),
        ).toEqual({ workStart: "08:00", workEnd: "20:00", maxBookingHours: 6 });
    });

    it("rejects bad hours format", () => {
        expect(() =>
            validateSettingsUpdate({
                workStart: "8:00",
                workEnd: "20:00",
                maxBookingHours: 6,
            }),
        ).toThrow(AppError);
        expect(() =>
            validateSettingsUpdate({
                workStart: "08:60",
                workEnd: "20:00",
                maxBookingHours: 6,
            }),
        ).toThrow(AppError);
    });

    it("rejects workEnd <= workStart and bad maxBookingHours", () => {
        expect(() =>
            validateSettingsUpdate({
                workStart: "20:00",
                workEnd: "08:00",
                maxBookingHours: 6,
            }),
        ).toThrow(AppError);
        expect(() =>
            validateSettingsUpdate({
                workStart: "08:00",
                workEnd: "20:00",
                maxBookingHours: 13,
            }),
        ).toThrow(AppError);
        expect(() =>
            validateSettingsUpdate({
                workStart: "08:00",
                workEnd: "20:00",
                maxBookingHours: 0,
            }),
        ).toThrow(AppError);
    });
});
