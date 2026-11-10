import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import { logger } from './utils/logger.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Подключаем группы маршрутов
app.use('/api', authRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/api/health', (req, res) => {
    logger.info('Health check endpoint accessed');
    res.json({ status: 'success', message: 'Server is running successfully!' });
});

app.listen(PORT, () => {
    logger.info(`Server successfully started on port ${PORT}`, { port: PORT, env: process.env.NODE_ENV || 'development' });
});
