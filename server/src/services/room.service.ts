import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { AppError } from "../api/errors.js";
import {
    equipmentExists,
    isNotFoundError,
    isUniqueConstraintError,
} from "../validators/room.validators.js";

export async function assertEquipmentExists(ids: number[]): Promise<void> {
    const exists = await equipmentExists(ids);

    if (!exists) {
        throw new AppError("One or more equipment IDs do not exist", 400);
    }
}

export async function listEquipment() {
    return prisma.equipment.findMany({ orderBy: { name: "asc" } });
}

export async function listRoomsForManagement() {
    return prisma.room.findMany({
        include: { equipment: { include: { equipment: true } } },
        orderBy: { name: "asc" },
    });
}

export async function createRoom(input: {
    name: string;
    capacity: number;
    equipmentIds: number[];
}) {
    await assertEquipmentExists(input.equipmentIds);

    return prisma.room.create({
        data: {
            name: input.name,
            capacity: input.capacity,
            equipment: {
                create: input.equipmentIds.map((equipmentId) => ({
                    equipment: { connect: { id: equipmentId } },
                })),
            },
        },
        include: { equipment: { include: { equipment: true } } },
    });
}

export async function updateRoom(
    id: number,
    input: { name?: string; capacity?: number; equipmentIds?: number[] },
) {
    const updates: Prisma.RoomUpdateInput = {};

    if (input.name !== undefined) {
        updates.name = input.name;
    }

    if (input.capacity !== undefined) {
        updates.capacity = input.capacity;
    }

    if (input.equipmentIds !== undefined) {
        await assertEquipmentExists(input.equipmentIds);

        updates.equipment = {
            deleteMany: {},
            create: input.equipmentIds.map((equipmentId) => ({
                equipment: { connect: { id: equipmentId } },
            })),
        };
    }

    try {
        return await prisma.room.update({
            where: { id },
            data: updates,
            include: { equipment: { include: { equipment: true } } },
        });
    } catch (error) {
        if (isNotFoundError(error)) {
            throw new AppError("Room not found", 404);
        }

        if (isUniqueConstraintError(error)) {
            throw new AppError("A room with this name already exists", 409);
        }

        throw error;
    }
}

export async function setRoomBlocked(id: number, isBlocked: boolean) {
    const existingRoom = await prisma.room.findUnique({ where: { id } });

    if (!existingRoom) {
        throw new AppError("Room not found", 404);
    }

    return prisma.room.update({ where: { id }, data: { isBlocked } });
}

export async function createEquipment(name: string) {
    try {
        return await prisma.equipment.create({ data: { name } });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new AppError("Equipment with this name already exists", 409);
        }

        throw error;
    }
}

export async function updateEquipment(id: number, name: string) {
    const existingEquipment = await prisma.equipment.findUnique({ where: { id } });

    if (!existingEquipment) {
        throw new AppError("Equipment not found", 404);
    }

    try {
        return await prisma.equipment.update({
            where: { id },
            data: { name },
        });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new AppError("Equipment with this name already exists", 409);
        }

        throw error;
    }
}

export async function getAvailableRooms(
    start: Date,
    end: Date,
    opts: { capacity?: number | undefined; equipmentIds: number[] },
) {
    const where: Prisma.RoomWhereInput = {
        isBlocked: false,
        bookings: {
            none: {
                startTime: { lt: end },
                endTime: { gt: start },
            },
        },
    };

    if (opts.capacity !== undefined) {
        where.capacity = { gte: opts.capacity };
    }

    if (opts.equipmentIds && opts.equipmentIds.length > 0) {
        where.AND = opts.equipmentIds.map((equipmentId) => ({
            equipment: {
                some: { equipmentId },
            },
        }));
    }

    return prisma.room.findMany({
        where,
        include: { equipment: { include: { equipment: true } } },
        orderBy: { name: "asc" },
    });
}
