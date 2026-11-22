import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

/**
 * Один способ сообщать об ошибках клиенту:
 * { status: 'error', error: <message> }
 */
export class AppError extends Error {
    public readonly status: number;

    constructor(message: string, status = 400) {
        super(message);
        this.name = 'AppError';
        this.status = status;
    }
}

export function errorHandler(
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    if (res.headersSent) {
        res.end();
        return;
    }

    if (err instanceof AppError) {
        if (err.status >= 500) {
            logger.error(`${req.method} ${req.url} -> ${err.status}`, err);
        }

        res.status(err.status).json({
            status: 'error',
            error: err.message
        });
        return;
    }

    logger.error(`${req.method} ${req.url} -> 500`, err);

    res.status(500).json({
        status: 'error',
        error: 'Internal server error'
    });
}
