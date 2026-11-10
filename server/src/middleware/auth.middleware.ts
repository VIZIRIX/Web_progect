import { type Request, type Response, type NextFunction } from 'express';
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

export function verifyToken(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token missing. Access denied.' });
    }

    const secret = process.env.JWT_SECRET || 'default_secret_key';

    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token.' });
        }

        req.user = decoded as JwtPayloadPayload;
        next();
    });
}