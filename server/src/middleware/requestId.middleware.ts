import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

declare global {
    namespace Express {
        interface Request {
            requestId?: string;
        }
    }
}

/** Служебный идентификатор запроса: в заголовок ответа и в логи. */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const requestId = randomUUID();

    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    next();
}
