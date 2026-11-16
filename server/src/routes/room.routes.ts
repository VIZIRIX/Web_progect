
import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { verifyToken } from '../middleware/auth.middleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

// Получение списка оборудования
router.get('/equipment', verifyToken, async (_req: Request, res: Response) => {
    try {
        const equipment = await prisma.equipment.findMany({
            orderBy: {
                name: 'asc'
            }
        });

        return res.status(200).json({
            status: 'success',
            count: equipment.length,
            equipment
        });
    } catch (error: unknown) {
        console.error('Error fetching equipment:', error);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Получение свободных комнат
router.get('/available', verifyToken, async (req: Request, res: Response) => {
    try {
        const startTime = typeof req.query.startTime === 'string'
            ? req.query.startTime
            : null;

        const endTime = typeof req.query.endTime === 'string'
            ? req.query.endTime
            : null;

        const capacityValue = typeof req.query.capacity === 'string'
            ? req.query.capacity
            : null;

        const equipmentValue = typeof req.query.equipmentIds === 'string'
            ? req.query.equipmentIds
            : null;

        if (!startTime || !endTime) {
            return res.status(400).json({
                error: 'Start time and end time are required'
            });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);

        if (
            isNaN(start.getTime()) ||
            isNaN(end.getTime()) ||
            end <= start
        ) {
            return res.status(400).json({
                error: 'Invalid date range'
            });
        }

        let capacity: number | undefined;

        if (capacityValue !== null) {
            capacity = Number(capacityValue);

            if (!Number.isSafeInteger(capacity) || capacity < 1) {
                return res.status(400).json({
                    error: 'Invalid room capacity'
                });
            }
        }

        let equipmentIds: number[] = [];

        if (equipmentValue) {
            equipmentIds = equipmentValue.split(',').map(Number);

            if (
                equipmentIds.some(
                    id => !Number.isSafeInteger(id) || id <= 0
                ) ||
                new Set(equipmentIds).size !== equipmentIds.length
            ) {
                return res.status(400).json({
                    error: 'Invalid equipment IDs'
                });
            }
        }

        const where: Prisma.RoomWhereInput = {
            isBlocked: false,

            bookings: {
                none: {
                    startTime: {
                        lt: end
                    },
                    endTime: {
                        gt: start
                    }
                }
            }
        };

        if (capacity !== undefined) {
            where.capacity = {
                gte: capacity
            };
        }

        if (equipmentIds.length > 0) {
            where.AND = equipmentIds.map((equipmentId) => ({
                equipment: {
                    some: {
                        equipmentId
                    }
                }
            }));
        }

        const rooms = await prisma.room.findMany({
            where,
            include: {
                equipment: {
                    include: {
                        equipment: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        return res.status(200).json({
            status: 'success',
            count: rooms.length,
            rooms
        });

    } catch (error: unknown) {
        console.error('Error fetching available rooms:', error);

        return res.status(500).json({
            error: 'Internal server error'
        });
    }
});

export default router;
