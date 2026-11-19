
import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import {
    verifyToken,
    requireRole,
    USER_ROLES
} from '../middleware/auth.middleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

const managerRoles = [
    USER_ROLES.OFFICE_MANAGER,
    USER_ROLES.ADMIN
] as const;

// Проверка, что полученные данные являются объектом
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value);
}

// Проверка массива идентификаторов оборудования
function isEquipmentIdArray(value: unknown): value is number[] {
    if (!Array.isArray(value)) {
        return false;
    }

    return value.every(
        (id: unknown) =>
            typeof id === 'number' &&
            Number.isSafeInteger(id) &&
            id > 0
    ) && new Set(value).size === value.length;
}

// Проверка существования оборудования
async function equipmentExists(ids: number[]): Promise<boolean> {
    if (ids.length === 0) {
        return true;
    }

    const count = await prisma.equipment.count({
        where: {
            id: { in: ids }
        }
    });

    return count === ids.length;
}

// Проверка конфликта уникальности
function isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002';
}

// Получение всех типов оборудования
// Доступно всем авторизованным пользователям
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

// Получение всех комнат, включая заблокированные
// Доступно офис-менеджеру и администратору
router.get(
    '/management',
    verifyToken,
    requireRole(...managerRoles),
    async (_req: Request, res: Response) => {
        try {
            const rooms = await prisma.room.findMany({
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
            console.error('Error fetching rooms for management:', error);

            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }
);

// Создание комнаты
// Доступно офис-менеджеру и администратору
router.post(
    '/',
    verifyToken,
    requireRole(...managerRoles),
    async (req: Request, res: Response) => {
        const body: unknown = req.body;

        if (!isRecord(body)) {
            return res.status(400).json({
                error: 'Invalid room data'
            });
        }

        const name = body.name;
        const capacity = body.capacity;
        const equipmentIdsValue =
            body.equipmentIds === undefined ? [] : body.equipmentIds;

        if (
            typeof name !== 'string' ||
            !name.trim() ||
            typeof capacity !== 'number' ||
            !Number.isSafeInteger(capacity) ||
            capacity < 1 ||
            !isEquipmentIdArray(equipmentIdsValue)
        ) {
            return res.status(400).json({
                error: 'Invalid room data'
            });
        }

        try {
            const exists = await equipmentExists(equipmentIdsValue);

            if (!exists) {
                return res.status(400).json({
                    error: 'One or more equipment IDs do not exist'
                });
            }

            const room = await prisma.room.create({
                data: {
                    name: name.trim(),
                    capacity,
                    equipment: {
                        create: equipmentIdsValue.map((equipmentId) => ({
                            equipment: {
                                connect: { id: equipmentId }
                            }
                        }))
                    }
                },
                include: {
                    equipment: {
                        include: {
                            equipment: true
                        }
                    }
                }
            });

            return res.status(201).json({
                status: 'success',
                message: 'Room created successfully',
                room
            });
        } catch (error: unknown) {
            if (isUniqueConstraintError(error)) {
                return res.status(409).json({
                    error: 'A room with this name already exists'
                });
            }

            console.error('Error creating room:', error);

            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }
);

// Изменение комнаты: название, вместимость и оборудование
// Доступно офис-менеджеру и администратору
router.patch(
    '/:id',
    verifyToken,
    requireRole(...managerRoles),
    async (req: Request, res: Response) => {
        const roomId = Number(req.params.id);
        const body: unknown = req.body;

        if (!Number.isSafeInteger(roomId) || roomId <= 0) {
            return res.status(400).json({
                error: 'Invalid room ID'
            });
        }

        if (!isRecord(body)) {
            return res.status(400).json({
                error: 'Invalid room data'
            });
        }

        const hasName = Object.prototype.hasOwnProperty.call(body, 'name');
        const hasCapacity = Object.prototype.hasOwnProperty.call(body, 'capacity');
        const hasEquipment = Object.prototype.hasOwnProperty.call(body, 'equipmentIds');

        if (!hasName && !hasCapacity && !hasEquipment) {
            return res.status(400).json({
                error: 'No changes provided'
            });
        }

        const updates: Prisma.RoomUpdateInput = {};

        if (hasName) {
            if (typeof body.name !== 'string' || !body.name.trim()) {
                return res.status(400).json({
                    error: 'Invalid room name'
                });
            }

            updates.name = body.name.trim();
        }

        if (hasCapacity) {
            if (
                typeof body.capacity !== 'number' ||
                !Number.isSafeInteger(body.capacity) ||
                body.capacity < 1
            ) {
                return res.status(400).json({
                    error: 'Invalid room capacity'
                });
            }

            updates.capacity = body.capacity;
        }

        if (hasEquipment) {
            if (!isEquipmentIdArray(body.equipmentIds)) {
                return res.status(400).json({
                    error: 'Invalid equipment IDs'
                });
            }

            try {
                const exists = await equipmentExists(body.equipmentIds);

                if (!exists) {
                    return res.status(400).json({
                        error: 'One or more equipment IDs do not exist'
                    });
                }

                updates.equipment = {
                    deleteMany: {},
                    create: body.equipmentIds.map((equipmentId) => ({
                        equipment: {
                            connect: { id: equipmentId }
                        }
                    }))
                };
            } catch (error: unknown) {
                console.error('Error checking equipment:', error);

                return res.status(500).json({
                    error: 'Internal server error'
                });
            }
        }

        try {
            const existingRoom = await prisma.room.findUnique({
                where: { id: roomId }
            });

            if (!existingRoom) {
                return res.status(404).json({
                    error: 'Room not found'
                });
            }

            const room = await prisma.room.update({
                where: { id: roomId },
                data: updates,
                include: {
                    equipment: {
                        include: {
                            equipment: true
                        }
                    }
                }
            });

            return res.status(200).json({
                status: 'success',
                message: 'Room updated successfully',
                room
            });
        } catch (error: unknown) {
            if (isUniqueConstraintError(error)) {
                return res.status(409).json({
                    error: 'A room with this name already exists'
                });
            }

            console.error('Error updating room:', error);

            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }
);

// Блокировка или разблокировка комнаты
// Доступно офис-менеджеру и администратору
router.patch(
    '/:id/block',
    verifyToken,
    requireRole(...managerRoles),
    async (req: Request, res: Response) => {
        const roomId = Number(req.params.id);
        const body: unknown = req.body;

        if (!Number.isSafeInteger(roomId) || roomId <= 0) {
            return res.status(400).json({
                error: 'Invalid room ID'
            });
        }

        if (!isRecord(body) || typeof body.isBlocked !== 'boolean') {
            return res.status(400).json({
                error: 'isBlocked must be true or false'
            });
        }

        try {
            const existingRoom = await prisma.room.findUnique({
                where: { id: roomId }
            });

            if (!existingRoom) {
                return res.status(404).json({
                    error: 'Room not found'
                });
            }

            const room = await prisma.room.update({
                where: { id: roomId },
                data: {
                    isBlocked: body.isBlocked
                }
            });

            return res.status(200).json({
                status: 'success',
                message: body.isBlocked
                    ? 'Room blocked successfully'
                    : 'Room unblocked successfully',
                room
            });
        } catch (error: unknown) {
            console.error('Error changing room block status:', error);

            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }
);

// Добавление нового типа оборудования
// Доступно офис-менеджеру и администратору
router.post(
    '/equipment',
    verifyToken,
    requireRole(...managerRoles),
    async (req: Request, res: Response) => {
        const body: unknown = req.body;

        if (
            !isRecord(body) ||
            typeof body.name !== 'string' ||
            !body.name.trim()
        ) {
            return res.status(400).json({
                error: 'Invalid equipment name'
            });
        }

        try {
            const equipment = await prisma.equipment.create({
                data: {
                    name: body.name.trim()
                }
            });

            return res.status(201).json({
                status: 'success',
                message: 'Equipment created successfully',
                equipment
            });
        } catch (error: unknown) {
            if (isUniqueConstraintError(error)) {
                return res.status(409).json({
                    error: 'Equipment with this name already exists'
                });
            }

            console.error('Error creating equipment:', error);

            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }
);

// Изменение названия типа оборудования
// Доступно офис-менеджеру и администратору
router.patch(
    '/equipment/:id',
    verifyToken,
    requireRole(...managerRoles),
    async (req: Request, res: Response) => {
        const equipmentId = Number(req.params.id);
        const body: unknown = req.body;

        if (!Number.isSafeInteger(equipmentId) || equipmentId <= 0) {
            return res.status(400).json({
                error: 'Invalid equipment ID'
            });
        }

        if (
            !isRecord(body) ||
            typeof body.name !== 'string' ||
            !body.name.trim()
        ) {
            return res.status(400).json({
                error: 'Invalid equipment name'
            });
        }

        try {
            const existingEquipment = await prisma.equipment.findUnique({
                where: { id: equipmentId }
            });

            if (!existingEquipment) {
                return res.status(404).json({
                    error: 'Equipment not found'
                });
            }

            const equipment = await prisma.equipment.update({
                where: { id: equipmentId },
                data: {
                    name: body.name.trim()
                }
            });

            return res.status(200).json({
                status: 'success',
                message: 'Equipment updated successfully',
                equipment
            });
        } catch (error: unknown) {
            if (isUniqueConstraintError(error)) {
                return res.status(409).json({
                    error: 'Equipment with this name already exists'
                });
            }

            console.error('Error updating equipment:', error);

            return res.status(500).json({
                error: 'Internal server error'
            });
        }
    }
);

// Получение свободных комнат
// Доступно всем авторизованным пользователям
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

