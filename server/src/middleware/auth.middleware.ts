import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { prisma } from "../db.js";
import { AppError } from "../api/errors.js";

// Допустимые роли системы
export const USER_ROLES = {
    EMPLOYEE: "employee",
    OFFICE_MANAGER: "office_manager",
    ADMIN: "admin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface JwtPayloadPayload {
    userId: number;
    email: string;
    role: UserRole;
}

function isUserRole(role: string): role is UserRole {
    return Object.values(USER_ROLES).includes(role as UserRole);
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayloadPayload;
        }
    }
}

/** Офис-менеджеры и администраторы имеют повышенные права. */
export function isManager(role: UserRole): boolean {
    return role === USER_ROLES.OFFICE_MANAGER || role === USER_ROLES.ADMIN;
}

/** Проверка авторизации пользователя. Бросает AppError при ошибке. */
export async function verifyToken(req: Request, _res: Response, next: NextFunction): Promise<void> {
    try {
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new AppError("Server JWT configuration error", 500);
        }

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AppError("Authorization token missing", 401);
        }

        const token = authHeader.slice(7);

        let decoded: string | JwtPayload;

        try {
            decoded = jwt.verify(token, secret);
        } catch {
            throw new AppError("Invalid or expired token", 403);
        }

        if (typeof decoded === "string") {
            throw new AppError("Invalid token payload", 403);
        }

        const userId = decoded.userId;
        const email = decoded.email;

        if (typeof userId !== "number" || typeof email !== "string") {
            throw new AppError("Invalid token payload", 403);
        }

        // Получаем актуальные данные пользователя из базы
        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                email: true,
                role: true,
            },
        });

        if (!user || user.email !== email) {
            throw new AppError("User not found or account changed", 401);
        }

        // Проверяем актуальную роль
        if (!isUserRole(user.role)) {
            throw new AppError("User role is not recognized", 403);
        }

        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        next();
    } catch (err) {
        next(err);
    }
}

/** Проверка разрешённых ролей. */
export function requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            throw new AppError("Authentication required", 401);
        }

        if (!allowedRoles.includes(req.user.role)) {
            throw new AppError("You do not have permission to perform this action", 403);
        }

        next();
    };
}
