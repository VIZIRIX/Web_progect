import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

/** Логирует каждый HTTP-запрос в одной строке: метод, путь, статус, время. */
export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();

    res.on('finish', () => {
        logger.info(
            `${req.method} ${req.baseUrl || ''}${req.path} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
        );
    });

    next();
}
