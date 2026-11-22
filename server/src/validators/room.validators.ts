import { Prisma } from '@prisma/client';
import { AppError } from '../api/errors.js';
import { prisma } from '../db.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value);
}

export function isEquipmentIdArray(value: unknown): value is number[] {
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

/** Проверка существования оборудования в БД. */
export async function equipmentExists(ids: number[]): Promise<boolean> {
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

export function isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002';
}

export function isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025';
}

export function parseRoomIdParam(value: unknown): number {
    if (typeof value !== 'string') {
        throw new AppError('Invalid room ID', 400);
    }

    const roomId = Number(value);

    if (!Number.isSafeInteger(roomId) || roomId <= 0) {
        throw new AppError('Invalid room ID', 400);
    }

    return roomId;
}

export function validateRoomCreateInput(body: unknown): {
    name: string;
    capacity: number;
    equipmentIds: number[];
} {
    if (!isRecord(body)) {
        throw new AppError('Invalid room data', 400);
    }

    const name = body.name;
    const capacity = body.capacity;
    const equipmentIds =
        body.equipmentIds === undefined ? [] : body.equipmentIds;

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof capacity !== 'number' ||
        !Number.isSafeInteger(capacity) ||
        capacity < 1 ||
        !isEquipmentIdArray(equipmentIds)
    ) {
        throw new AppError('Invalid room data', 400);
    }

    return { name: name.trim(), capacity, equipmentIds };
}

export function validateRoomUpdateInput(body: unknown): {
    name?: string;
    capacity?: number;
    equipmentIds?: number[];
} {
    if (!isRecord(body)) {
        throw new AppError('Invalid room data', 400);
    }

    const updates: {
        name?: string;
        capacity?: number;
        equipmentIds?: number[];
    } = {};
    let hasChanges = false;

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
        if (typeof body.name !== 'string' || !body.name.trim()) {
            throw new AppError('Invalid room name', 400);
        }

        updates.name = body.name.trim();
        hasChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'capacity')) {
        if (
            typeof body.capacity !== 'number' ||
            !Number.isSafeInteger(body.capacity) ||
            body.capacity < 1
        ) {
            throw new AppError('Invalid room capacity', 400);
        }

        updates.capacity = body.capacity;
        hasChanges = true;
    }

    if (Object.prototype.hasOwnProperty.call(body, 'equipmentIds')) {
        if (!isEquipmentIdArray(body.equipmentIds)) {
            throw new AppError('Invalid equipment IDs', 400);
        }

        updates.equipmentIds = body.equipmentIds;
        hasChanges = true;
    }

    if (!hasChanges) {
        throw new AppError('No changes provided', 400);
    }

    return updates;
}

export function validateRoomBlockInput(body: unknown): boolean {
    if (!isRecord(body) || typeof body.isBlocked !== 'boolean') {
        throw new AppError('isBlocked must be true or false', 400);
    }

    return body.isBlocked;
}

export function validateEquipmentCreateInput(body: unknown): string {
    if (
        !isRecord(body) ||
        typeof body.name !== 'string' ||
        !body.name.trim()
    ) {
        throw new AppError('Invalid equipment name', 400);
    }

    return body.name.trim();
}

export function parseEquipmentIdParam(value: unknown): number {
    if (typeof value !== 'string') {
        throw new AppError('Invalid equipment ID', 400);
    }

    const equipmentId = Number(value);

    if (!Number.isSafeInteger(equipmentId) || equipmentId <= 0) {
        throw new AppError('Invalid equipment ID', 400);
    }

    return equipmentId;
}

export interface AvailableRoomsFilter {
    start: Date;
    end: Date;
    capacity: number | undefined;
    equipmentIds: number[];
}

/** Парсинг параметров поиска свободных комнат: startTime, endTime, capacity, equipmentIds. */
export function parseAvailableRoomsQuery(
    query: Record<string, unknown>
): AvailableRoomsFilter {
    const startTime =
        typeof query.startTime === 'string' ? query.startTime : null;
    const endTime = typeof query.endTime === 'string' ? query.endTime : null;

    if (!startTime || !endTime) {
        throw new AppError('Start time and end time are required', 400);
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (
        isNaN(start.getTime()) ||
        isNaN(end.getTime()) ||
        end.getTime() <= start.getTime()
    ) {
        throw new AppError('Invalid date range', 400);
    }

    let capacity: number | undefined;

    if (typeof query.capacity === 'string') {
        capacity = Number(query.capacity);

        if (!Number.isSafeInteger(capacity) || capacity < 1) {
            throw new AppError('Invalid room capacity', 400);
        }
    }

    let equipmentIds: number[] = [];

    if (typeof query.equipmentIds === 'string') {
        equipmentIds = query.equipmentIds.split(',').map(Number);

        if (
            equipmentIds.some(
                id => !Number.isSafeInteger(id) || id <= 0
            ) ||
            new Set(equipmentIds).size !== equipmentIds.length
        ) {
            throw new AppError('Invalid equipment IDs', 400);
        }
    }

    return { start, end, capacity, equipmentIds };
}
