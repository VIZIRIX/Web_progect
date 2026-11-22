import express from 'express';
import cors from 'cors';
import { loggerMiddleware } from './middleware/logger.middleware.js';
import { errorHandler } from './api/errors.js';
import authRoutes from './routes/auth.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import roomRoutes from './routes/room.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import { logger } from './utils/logger.js';

/** Фабрика Express-приложения: сборка всех middleware, routes и error handler. */
export function createApp(): ReturnType<typeof express> {
    const app = express();

    app.use(express.json({ limit: '1mb' }));
    app.use(cors());
    app.use(loggerMiddleware);

    app.use('/api', authRoutes);
    app.use('/api/bookings', bookingRoutes);
    app.use('/api/rooms', roomRoutes);
    app.use('/api/settings', settingsRoutes);

    app.get('/api/health', (_req, res) => {
        logger.info('Health check endpoint accessed');
        res.json({
            status: 'success',
            message: 'Server is running successfully!'
        });
    });

    app.use(errorHandler);

    return app;
}
