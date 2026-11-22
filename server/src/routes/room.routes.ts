import { Router } from 'express';
import type { Request, Response } from 'express';
import {
    requireRole,
    USER_ROLES,
    verifyToken
} from '../middleware/auth.middleware.js';
import { sendSuccess } from '../api/response.js';
import {
    createEquipment,
    createRoom,
    getAvailableRooms,
    listEquipment,
    listRoomsForManagement,
    setRoomBlocked,
    updateEquipment,
    updateRoom
} from '../services/room.service.js';
import {
    parseAvailableRoomsQuery,
    parseEquipmentIdParam,
    parseRoomIdParam,
    validateEquipmentCreateInput,
    validateRoomBlockInput,
    validateRoomCreateInput,
    validateRoomUpdateInput
} from '../validators/room.validators.js';

const router: Router = Router();

// Все типы оборудования
router.get('/equipment', verifyToken, async (_req: Request, res: Response) => {
    const equipment = await listEquipment();

    sendSuccess(res, 200, { count: equipment.length, equipment });
});

// Все комнаты, включая заблокированные (только офис-менеджер и администратор)
router.get(
    '/management',
    verifyToken,
    requireRole(USER_ROLES.OFFICE_MANAGER, USER_ROLES.ADMIN),
    async (_req: Request, res: Response) => {
        const rooms = await listRoomsForManagement();

        sendSuccess(res, 200, { count: rooms.length, rooms });
    }
);

// Создание комнаты
router.post(
    '/',
    verifyToken,
    requireRole(USER_ROLES.OFFICE_MANAGER, USER_ROLES.ADMIN),
    async (req: Request, res: Response) => {
        const input = validateRoomCreateInput(req.body);
        const room = await createRoom(input);

        sendSuccess(res, 201, {
            message: 'Room created successfully',
            room
        });
    }
);

// Изменение комнаты: название, вместимость и оборудование
router.patch(
    '/:id',
    verifyToken,
    requireRole(USER_ROLES.OFFICE_MANAGER, USER_ROLES.ADMIN),
    async (req: Request, res: Response) => {
        const roomId = parseRoomIdParam(req.params.id);
        const updates = validateRoomUpdateInput(req.body);

        const room = await updateRoom(roomId, updates);

        sendSuccess(res, 200, {
            message: 'Room updated successfully',
            room
        });
    }
);

// Блокировка или разблокировка комнаты
router.patch(
    '/:id/block',
    verifyToken,
    requireRole(USER_ROLES.OFFICE_MANAGER, USER_ROLES.ADMIN),
    async (req: Request, res: Response) => {
        const roomId = parseRoomIdParam(req.params.id);
        const isBlocked = validateRoomBlockInput(req.body);

        const room = await setRoomBlocked(roomId, isBlocked);

        sendSuccess(res, 200, {
            message: isBlocked
                ? 'Room blocked successfully'
                : 'Room unblocked successfully',
            room
        });
    }
);

// Добавление типа оборудования
router.post(
    '/equipment',
    verifyToken,
    requireRole(USER_ROLES.OFFICE_MANAGER, USER_ROLES.ADMIN),
    async (req: Request, res: Response) => {
        const equipment = await createEquipment(
            validateEquipmentCreateInput(req.body)
        );

        sendSuccess(res, 201, {
            message: 'Equipment created successfully',
            equipment
        });
    }
);

// Изменение названия типа оборудования
router.patch(
    '/equipment/:id',
    verifyToken,
    requireRole(USER_ROLES.OFFICE_MANAGER, USER_ROLES.ADMIN),
    async (req: Request, res: Response) => {
        const equipmentId = parseEquipmentIdParam(req.params.id);
        const equipment = await updateEquipment(
            equipmentId,
            validateEquipmentCreateInput(req.body)
        );

        sendSuccess(res, 200, {
            message: 'Equipment updated successfully',
            equipment
        });
    }
);

// Получение свободных комнат
router.get('/available', verifyToken, async (req: Request, res: Response) => {
    const filter = parseAvailableRoomsQuery(req.query);
    const rooms = await getAvailableRooms(filter.start, filter.end, {
        capacity: filter.capacity,
        equipmentIds: filter.equipmentIds
    });

    sendSuccess(res, 200, { count: rooms.length, rooms });
});

export default router;
