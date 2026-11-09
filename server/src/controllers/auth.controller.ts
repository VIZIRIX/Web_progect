import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';

export async function register(req: Request, res: Response) {
    try {
        const { name, email, password, departmentId } = req.body;
        const user = await authService.registerUser(name, email, password, Number(departmentId));

        res.status(201).json({
            status: 'success',
            message: 'Registration successful',
            userId: user.id
        });
    } catch (error: any) {
        res.status(400).json({
            status: 'error',
            error: error.message
        });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;
        const user = await authService.loginUser(email, password);

        res.json({
            status: 'success',
            message: 'Login successful',
            token: 'token-' + user.id,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error: any) {
        res.status(401).json({
            status: 'error',
            error: error.message
        });
    }
}
