import { AppError } from "../api/errors.js";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseDepartmentIdParam(value: unknown): number {
    if (typeof value !== "string") {
        throw new AppError("Invalid department ID", 400);
    }

    const departmentId = Number(value);

    if (!Number.isSafeInteger(departmentId) || departmentId <= 0) {
        throw new AppError("Invalid department ID", 400);
    }

    return departmentId;
}

export function validateDepartmentCreateInput(body: unknown): { name: string } {
    if (!isRecord(body) || typeof body.name !== "string" || !body.name.trim()) {
        throw new AppError("Invalid department name", 400);
    }

    return { name: body.name.trim() };
}

export function validateDepartmentUpdateInput(body: unknown): { name?: string } {
    if (!isRecord(body)) {
        throw new AppError("Invalid department data", 400);
    }

    const updates: { name?: string } = {};
    let hasChanges = false;

    if (Object.prototype.hasOwnProperty.call(body, "name")) {
        if (typeof body.name !== "string" || !body.name.trim()) {
            throw new AppError("Invalid department name", 400);
        }

        updates.name = body.name.trim();
        hasChanges = true;
    }

    if (!hasChanges) {
        throw new AppError("No changes provided", 400);
    }

    return updates;
}
