import { prisma } from "../db.js";
import { AppError } from "../api/errors.js";
import type { UserRole } from "../middleware/auth.middleware.js";

export async function listUsersForManagement() {
    return prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: { select: { name: true } },
        },
        orderBy: { name: "asc" },
    });
}

export async function setUserRole(userId: number, role: UserRole) {
    const existing = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
    });

    if (!existing) {
        throw new AppError("User not found", 404);
    }

    return prisma.user.update({ where: { id: userId }, data: { role } });
}
