import { AppError } from "../api/errors.js";
import { USER_ROLES, type UserRole } from "../middleware/auth.middleware.js";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseUserIdParam(value: unknown): number {
    if (typeof value !== "string") {
        throw new AppError("Invalid user ID", 400);
    }

    const userId = Number(value);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new AppError("Invalid user ID", 400);
    }

    return userId;
}

export function validateRoleInput(body: unknown): UserRole {
    if (
        !isRecord(body) ||
        typeof body.role !== "string" ||
        !Object.values(USER_ROLES).includes(body.role as UserRole)
    ) {
        throw new AppError("Invalid role", 400);
    }

    return body.role as UserRole;
}
