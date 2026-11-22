import { describe, expect, it } from "vitest";

import {
    parseEquipmentIdParam,
    parseRoomIdParam,
    validateRoomBlockInput,
    validateRoomCreateInput,
    validateRoomUpdateInput,
} from "./room.validators.js";

describe("validateRoomCreateInput", () => {
    it("accepts valid data", () => {
        expect(
            validateRoomCreateInput({
                name: "  H1  ",
                capacity: 10,
                equipmentIds: [1, 2],
            }),
        ).toEqual({ name: "H1", capacity: 10, equipmentIds: [1, 2] });
    });

    it("rejects invalid name/capacity/equipment arrays", () => {
        expect(() => validateRoomCreateInput({ name: "", capacity: 10 })).toThrow();
        expect(() => validateRoomCreateInput({ name: "H", capacity: 0 })).toThrow();
        expect(() => validateRoomCreateInput({ name: "H", capacity: 1.5 })).toThrow();
        expect(() =>
            validateRoomCreateInput({
                name: "H",
                capacity: 1,
                equipmentIds: [1, 1],
            }),
        ).toThrow();
    });
});

describe("validateRoomUpdateInput", () => {
    it("accepts partial updates", () => {
        expect(validateRoomUpdateInput({ name: "New" })).toEqual({ name: "New" });
        expect(validateRoomUpdateInput({ capacity: 5 })).toEqual({ capacity: 5 });
        expect(validateRoomUpdateInput({ equipmentIds: [3] })).toEqual({
            equipmentIds: [3],
        });
    });

    it("rejects empty updates", () => {
        expect(() => validateRoomUpdateInput({})).toThrow();
    });
});

describe("validateRoomBlockInput", () => {
    it("accepts boolean only", () => {
        expect(validateRoomBlockInput({ isBlocked: true })).toBe(true);
        expect(validateRoomBlockInput({ isBlocked: false })).toBe(false);
        expect(() => validateRoomBlockInput({ isBlocked: "yes" })).toThrow();
    });
});

describe("parseRoomIdParam / parseEquipmentIdParam", () => {
    it("parses positive ints", () => {
        expect(parseRoomIdParam("1")).toBe(1);
        expect(parseEquipmentIdParam("3")).toBe(3);
        expect(() => parseRoomIdParam("x")).toThrow();
        expect(() => parseRoomIdParam("-1")).toThrow();
    });
});
