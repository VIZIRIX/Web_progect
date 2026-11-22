import type { Response } from "express";

/** Унифицированный ответ: { status: 'success', ...data } */
export function sendSuccess(res: Response, status: number, data: object): void {
    res.status(status).json({ status: "success", ...data });
}
