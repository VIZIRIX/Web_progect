import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import { AppError } from '../api/errors.js';
import { logger } from '../utils/logger.js';

export async function registerUser(name: string, email: string, pass: string, departmentId: number) {
    logger.debug(`Attempting to register user`, { email });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        logger.warn(`Registration failed: email already in use`, { email });
        throw new AppError('User with this email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(pass, 10);
    
    const newUser = await prisma.user.create({
        data: {
            name,
            email,
            passwordHash: hashedPassword,
            departmentId,
            role: 'employee'
        }
    });

    logger.info(`User successfully registered`, { userId: newUser.id, email: newUser.email });
    return newUser;
}

export async function loginUser(email: string, pass: string) {
    logger.debug(`Attempting to authenticate user`, { email });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        logger.warn(`Authentication failed: user not found`, { email });
        throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordValid) {
        logger.warn(`Authentication failed: invalid password`, { userId: user.id, email });
        throw new AppError('Invalid email or password', 401);
    }

    logger.info(`User successfully authenticated`, { userId: user.id, email: user.email });
    return user;
}