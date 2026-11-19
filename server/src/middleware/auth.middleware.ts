
import type { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Допустимые роли системы
export const USER_ROLES = {
    EMPLOYEE: 'employee',
    OFFICE_MANAGER: 'office_manager',
    ADMIN: 'admin'
} as const;

export type UserRole =
    typeof USER_ROLES[keyof typeof USER_ROLES];

export interface JwtPayloadPayload {
    userId: number;
    email: string;
    role: UserRole;
}

// Проверка существования роли
function isUserRole(role: string): role is UserRole {
    return Object.values(USER_ROLES).includes(
        role as UserRole
    );
}

// Типизация пользователя в Express
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayloadPayload;
        }
    }
}

// Проверка авторизации пользователя
export async function verifyToken(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        res.status(500).json({
            error: 'Server JWT configuration error'
        });
        return;
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: 'Authorization token missing'
        });
        return;
    }

    const token = authHeader.slice(7);

    // Проверяем JWT
    let decoded;

    try {
        decoded = jwt.verify(token, secret);
    } catch {
        res.status(403).json({
            error: 'Invalid or expired token'
        });
        return;
    }

    if (
        typeof decoded === 'string' ||
        typeof decoded.userId !== 'number' ||
        typeof decoded.email !== 'string'
    ) {
        res.status(403).json({
            error: 'Invalid token payload'
        });
        return;
    }

    try {
        // Получаем актуальные данные пользователя из базы
        const user = await prisma.user.findUnique({
            where: {
                id: decoded.userId
            },
            select: {
                id: true,
                email: true,
                role: true
            }
        });

        if (!user || user.email !== decoded.email) {
            res.status(401).json({
                error: 'User not found or account changed'
            });
            return;
        }

        // Проверяем актуальную роль
        if (!isUserRole(user.role)) {
            res.status(403).json({
                error: 'User role is not recognized'
            });
            return;
        }

        // Сохраняем актуальные данные в запросе
        req.user = {
            userId: user.id,
            email: user.email,
            role: user.role
        };

        next();

    } catch (error: unknown) {
        console.error('Error verifying user:', error);

        res.status(500).json({
            error: 'Internal server error'
        });
    }
}

// Проверка разрешённых ролей
export function requireRole(...allowedRoles: UserRole[]) {
    return (
        req: Request,
        res: Response,
        next: NextFunction
    ): void => {

        if (!req.user) {
            res.status(401).json({
                error: 'Authentication required'
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: 'You do not have permission to perform this action'
            });
            return;
        }

        next();
    };
}

