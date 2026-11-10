
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as authService from '../services/auth.service.js';

export async function register(req: Request, res: Response) {
    try {
        const { name, email, password, departmentId } = req.body;

        if (!name || !email || !password || !departmentId) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }

        const user = await authService.registerUser(
            name.trim(),
            email.trim().toLowerCase(),
            password,
            Number(departmentId)
        );

        return res.status(201).json({
            status: 'success',
            message: 'Registration successful',
            userId: user.id
        });
    } catch (error: any) {
        return res.status(400).json({
            status: 'error',
            error: error.message
        });
    }
}

export async function login(req: Request, res: Response) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        const user = await authService.loginUser(
            email.trim().toLowerCase(),
            password
        );

        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('JWT_SECRET is not configured');
        }

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            secret,
            { expiresIn: '24h' }
        );

        return res.status(200).json({
            status: 'success',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error: any) {
        return res.status(401).json({
            status: 'error',
            error: error.message
        });
    }
}
