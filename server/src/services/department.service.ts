import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { AppError } from "../api/errors.js";
import {
    isNotFoundError,
    isUniqueConstraintError,
} from "../validators/room.validators.js";

export interface DepartmentCreateInput {
    name: string;
}

export interface DepartmentUpdateInput {
    name?: string;
}

export async function listDepartments() {
    return prisma.department.findMany({
        orderBy: { name: "asc" },
    });
}

export async function createDepartment(input: DepartmentCreateInput) {
    try {
        return await prisma.department.create({ data: { name: input.name } });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new AppError("Department with this name already exists", 409);
        }

        throw error;
    }
}

export async function updateDepartment(id: number, input: DepartmentUpdateInput) {
    const existing = await prisma.department.findUnique({ where: { id } });

    if (!existing) {
        throw new AppError("Department not found", 404);
    }

    const updates: Prisma.DepartmentUpdateInput = {};

    if (input.name !== undefined) {
        updates.name = input.name;
    }

    try {
        return await prisma.department.update({ where: { id }, data: updates });
    } catch (error) {
        if (isUniqueConstraintError(error)) {
            throw new AppError("Department with this name already exists", 409);
        }

        if (isNotFoundError(error)) {
            throw new AppError("Department not found", 404);
        }

        throw error;
    }
}

export async function deleteDepartment(id: number) {
    const existing = await prisma.department.findUnique({ where: { id } });

    if (!existing) {
        throw new AppError("Department not found", 404);
    }

    const usersCount = await prisma.user.count({ where: { departmentId: id } });

    if (usersCount > 0) {
        throw new AppError("Department has users, move them first", 409);
    }

    await prisma.department.delete({ where: { id } });

    return { message: "Department deleted" };
}
