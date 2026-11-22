import { describe, expect, it } from "vitest";

import { AppError } from "../api/errors.js";
import { validateLoginInput, validatePassword, validateRegisterInput } from "./auth.validators.js";

describe("validatePassword", () => {
    it("accepts compliant passwords", () => {
        expect(() => validatePassword("Pass123!")).not.toThrow();
        expect(() => validatePassword("aB3cdefgh")).not.toThrow();
    });

    it("rejects too short or missing digit/uppercase/lowercase", () => {
        expect(() => validatePassword("short1A")).toThrow(AppError); // < 8
        expect(() => validatePassword("nodigitA")).toThrow(AppError);
        expect(() => validatePassword("UPPERCASE1")).toThrow(AppError);
        expect(() => validatePassword("lowercase1")).toThrow(AppError);
    });
});

describe("validateRegisterInput", () => {
    const base = {
        name: "  Ivan  ",
        email: " IVAN@Example.com ",
        password: "Pass123!",
        departmentId: 3,
    };

    it("normalizes valid input", () => {
        expect(validateRegisterInput(base)).toEqual({
            name: "Ivan",
            email: "ivan@example.com",
            password: "Pass123!",
            departmentId: 3,
        });
    });

    it("rejects missing fields and bad password policy", () => {
        expect(() => validateRegisterInput(null)).toThrow(AppError);
        expect(() => validateRegisterInput({ ...base, departmentId: 0 })).toThrow(AppError);
        expect(() => validateRegisterInput({ ...base, password: "weak" })).toThrow(AppError);
    });
});

describe("validateLoginInput", () => {
    it("normalizes valid input", () => {
        expect(validateLoginInput({ email: " A@B.C ", password: " x " })).toEqual({
            email: "a@b.c",
            password: " x ",
        });
    });

    it("rejects missing fields", () => {
        expect(() => validateLoginInput({})).toThrow(AppError);
        expect(() => validateLoginInput({ email: "a@b.c" })).toThrow(AppError);
    });
});
