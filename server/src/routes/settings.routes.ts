
import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
    verifyToken,
    requireRole,
    USER_ROLES
} from '../middleware/auth.middleware.js';

const router: ReturnType<typeof Router> = Router();
const prisma = new PrismaClient();

// Получение настроек системы
router.get(
    '/',
    verifyToken,
    async (_req: Request, res: Response): Promise<void> => {
        try {
            const settings = await prisma.systemSettings.upsert({
                where: { id: 1 },
                update: {},
                create: { id: 1 }
            });

            res.json({
                status: 'success',
                settings
            });
        } catch (error) {
            console.error('Settings error:', error);
            res.status(500).json({
                error: 'Failed to load settings'
            });
        }
    }
);

// Изменение настроек — только администратор
router.put(
    '/',
    verifyToken,
    requireRole(USER_ROLES.ADMIN),
    async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                workStart,
                workEnd,
                maxBookingHours
            } = req.body;

            const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

            if (
                typeof workStart !== 'string' ||
                typeof workEnd !== 'string' ||
                !timePattern.test(workStart) ||
                !timePattern.test(workEnd)
            ) {
                res.status(400).json({
                    error: 'Invalid working hours'
                });
                return;
            }

            const startMinutes =
                Number(workStart.slice(0, 2)) * 60 +
                Number(workStart.slice(3, 5));

            const endMinutes =
                Number(workEnd.slice(0, 2)) * 60 +
                Number(workEnd.slice(3, 5));

            if (
                endMinutes <= startMinutes ||
                !Number.isInteger(maxBookingHours) ||
                maxBookingHours < 1 ||
                maxBookingHours > 12
            ) {
                res.status(400).json({
                    error: 'Invalid settings values'
                });
                return;
            }

            const settings = await prisma.systemSettings.upsert({
                where: { id: 1 },
                update: {
                    workStart,
                    workEnd,
                    maxBookingHours
                },
                create: {
                    id: 1,
                    workStart,
                    workEnd,
                    maxBookingHours
                }
            });

            res.json({
                status: 'success',
                message: 'Settings updated',
                settings
            });
        } catch (error) {
            console.error('Settings update error:', error);
            res.status(500).json({
                error: 'Failed to update settings'
            });
        }
    }
);

export default router;
