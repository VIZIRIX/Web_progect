import { AppError } from '../api/errors.js';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value);
}

export interface RegisterInput {
    name: string;
    email: string;
    password: string;
    departmentId: number;
}

export interface LoginInput {
    email: string;
    password: string;
}

export function validateRegisterInput(body: unknown): RegisterInput {
    if (
        !isRecord(body) ||
        typeof body.name !== 'string' ||
        typeof body.email !== 'string' ||
        typeof body.password !== 'string' ||
        typeof body.departmentId !== 'number' ||
        !Number.isSafeInteger(body.departmentId) ||
        body.departmentId <= 0
    ) {
        throw new AppError('All fields are required', 400);
    }

    return {
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        password: body.password,
        departmentId: body.departmentId
    };
}

export function validateLoginInput(body: unknown): LoginInput {
    if (
        !isRecord(body) ||
        typeof body.email !== 'string' ||
        typeof body.password !== 'string' ||
        !body.email ||
        !body.password
    ) {
        throw new AppError('Email and password are required', 400);
    }

    return {
        email: body.email.trim().toLowerCase(),
        password: body.password
    };
}
