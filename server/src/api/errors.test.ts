import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";

import { AppError, errorHandler } from "./errors.js";

type MockedRes = ReturnType<typeof createMockRes>["res"] extends infer R ? R : never;

function createMockRes() {
    const setHeaders: Record<string, string> = {};

    const res: {
        headersSent: boolean;
        statusCode: number;
        jsonBody: unknown;
        status: (code: number) => typeof res;
        set: (key: string, value: string) => typeof res;
        json: (body: unknown) => typeof res;
        end: () => void;
    } = {
        headersSent: false,
        statusCode: 200,
        jsonBody: undefined,
        status(code: number) {
            res.statusCode = code;
            return res;
        },
        set(key: string, value: string) {
            setHeaders[key] = value;
            return res;
        },
        json(body: unknown) {
            res.jsonBody = body;
            return res;
        },
        end() {
            res.headersSent = true;
        },
    };

    return { res, setHeaders };
}

function createMockReq(req: Partial<Request>): Request {
    return req as Request;
}

describe("AppError", () => {
    it("extends Error and carries status + title", () => {
        const error = new AppError("Not found", 404);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Not found");
        expect(error.title).toBe("Not found");
        expect(error.status).toBe(404);
    });

    it("defaults status to 400", () => {
        expect(new AppError("Bad input").status).toBe(400);
    });
});

describe("errorHandler", () => {
    it("responds with RFC 9457 problem+json for AppError", () => {
        const { res, setHeaders } = createMockRes();

        errorHandler(
            new AppError("Room is blocked", 409),
            createMockReq({ method: "POST", path: "/api/bookings" }),
            res as unknown as Response,
            () => {},
        );

        expect(res.statusCode).toBe(409);
        expect(setHeaders["Content-Type"]).toBe("application/problem+json");
        expect(res.jsonBody).toEqual({
            type: "https://web-project/errors/AppError",
            title: "Room is blocked",
            status: 409,
            detail: "Room is blocked",
            instance: "POST /api/bookings",
        });
    });

    it("responds with 500 problem+json for unknown errors (no stack)", () => {
        const { res, setHeaders } = createMockRes();
        const error = new Error("db exploded");

        errorHandler(
            error,
            createMockReq({ method: "GET", path: "/api/health" }),
            res as unknown as Response,
            () => {},
        );

        expect(res.statusCode).toBe(500);
        expect(setHeaders["Content-Type"]).toBe("application/problem+json");

        const body = res.jsonBody as Record<string, unknown>;
        expect(body.status).toBe(500);
        expect(body.title).toBe("Internal server error");
        expect(body.detail).toBe("Internal server error");
        expect(body.stack).toBeUndefined();
    });

    it("does nothing when headers are already sent", () => {
        const { res } = createMockRes();
        res.headersSent = true;

        errorHandler(new Error("late"), createMockReq({}), res as unknown as Response, () => {});

        expect(res.statusCode).toBe(200);
        expect(res.jsonBody).toBeUndefined();
    });
});
