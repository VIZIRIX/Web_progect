import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as authService from '../services/auth.service.js';
import { AppError } from '../api/errors.js';
import {
    validateLoginInput,
    validateRegisterInput
} from '../validators/auth.validators.js';

export async function register(req: Request, res: Response): Promise<void> {
    const { name, email, password, departmentId } = validateRegisterInput(
        req.body
    );

    const user = await authService.registerUser(
        name,
        email,
        password,
        departmentId
    );

    res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        userId: user.id
    });
}

export async function login(req: Request, res: Response): Promise<void> {
    const { email, password } = validateLoginInput(req.body);

    const user = await authService.loginUser(email, password);

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new AppError('JWT_SECRET is not configured', 500);
    }

    const token = jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        secret,
        { expiresIn: '24h' }
    );

    res.status(200).json({
        status: 'success',
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
}
