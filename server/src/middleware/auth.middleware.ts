
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayloadPayload {
    userId: number;
    email: string;
    role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayloadPayload;
        }
    }
}

export function verifyToken(
    req: Request,
    res: Response,
    next: NextFunction
) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        return res.status(500).json({
            error: 'Server JWT configuration error'
        });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'Authorization token missing'
        });
    }

    const token = authHeader.slice(7);

    try {
        const decoded = jwt.verify(token, secret);

        if (
            typeof decoded === 'string' ||
            typeof decoded.userId !== 'number' ||
            typeof decoded.email !== 'string' ||
            typeof decoded.role !== 'string'
        ) {
            return res.status(403).json({
                error: 'Invalid token payload'
            });
        }

        req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
        };

        next();
    } catch {
        return res.status(403).json({
            error: 'Invalid or expired token'
        });
    }
}
