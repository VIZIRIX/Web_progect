import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

/** Логирует каждый HTTP-запрос: метод, путь, статус, длительность, requestId. */
export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const method = req.method;
    const path = `${req.baseUrl || ""}${req.path}`;

    res.on("finish", () => {
        logger.info({
            message: `${method} ${path} -> ${res.statusCode}`,
            method,
            path,
            status: res.statusCode,
            ms: Date.now() - startedAt,
            requestId: req.requestId,
        });
    });

    next();
}
