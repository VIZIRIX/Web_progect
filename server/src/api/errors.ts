import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

/**
 * Ошибка, выбрасываемая сервером с конкретным HTTP-статусом.
 * В ответе клиенту уходит RFC 9457 problem+json.
 */
export class AppError extends Error {
    public readonly status: number;
    public readonly title: string;

    constructor(message: string, status = 400) {
        super(message);
        this.name = "AppError";
        this.status = status;
        this.title = message;
    }
}

export interface ProblemDetails {
    type: string;
    title: string;
    status: number;
    detail: string;
    instance?: string;
}

const ERROR_TYPE = "https://web-project/errors/AppError";
const INTERNAL_ERROR_TYPE = "https://web-project/errors/InternalServerError";

function toProblemDetails(err: AppError, instance?: string): ProblemDetails {
    return {
        type: ERROR_TYPE,
        title: err.title,
        status: err.status,
        detail: err.message,
        ...(instance ? { instance } : {}),
    };
}

/** Единственный обработчик всех ошибок (финальный middleware). */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
    if (res.headersSent) {
        res.end();
        return;
    }

    const instance = `${req.method} ${req.path}`;

    if (err instanceof AppError) {
        const problem = toProblemDetails(err, instance);

        if (err.status >= 500) {
            logger.error(`${req.method} ${req.url} -> ${err.status}`, err);
        }

        res.status(err.status).set("Content-Type", "application/problem+json").json(problem);
        return;
    }

    logger.error(`${req.method} ${req.url} -> 500`, err);

    res.status(500).set("Content-Type", "application/problem+json").json({
        type: INTERNAL_ERROR_TYPE,
        title: "Internal server error",
        status: 500,
        detail: "Internal server error",
        instance,
    });
}
