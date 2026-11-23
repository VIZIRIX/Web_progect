import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { loggerMiddleware } from "./middleware/logger.middleware.js";
import { requestIdMiddleware } from "./middleware/requestId.middleware.js";
import { errorHandler } from "./api/errors.js";
import authRoutes from "./routes/auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import roomRoutes from "./routes/room.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import departmentRoutes from "./routes/department.routes.js";
import userRoutes from "./routes/user.routes.js";
import { logger } from "./utils/logger.js";

/** Фабрика Express-приложения: сборка всех middleware, routes и error handler. */
export function createApp(): ReturnType<typeof express> {
    const app = express();

    app.use(helmet());

    // Rate-limit для публичных точек (регистрация/вход) — 100 попыток/15 мин.
    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 100,
            standardHeaders: true,
            legacyHeaders: false,
            message: {
                type: "https://web-project/errors/RateLimited",
                title: "Too many requests",
                status: 429,
                detail: "Too many requests, try again later.",
            },
        }),
    );

    app.use(
        cors({
            // Один допустимый origin — фронтенд. Для docker: http://web_project_frontend:5173
            origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
        }),
    );

    app.use(express.json({ limit: "1mb" }));
    app.use(requestIdMiddleware);
    app.use(loggerMiddleware);

    app.use("/api", authRoutes);
    app.use("/api/bookings", bookingRoutes);
    app.use("/api/me/notifications", notificationRoutes);
    app.use("/api/rooms", roomRoutes);
    app.use("/api/settings", settingsRoutes);
    app.use("/api/departments", departmentRoutes);
    app.use("/api/users", userRoutes);

    app.get("/api/health", (_req, res) => {
        logger.info("Health check endpoint accessed");
        res.json({
            status: "success",
            message: "Server is running successfully!",
        });
    });

    app.use(errorHandler);

    return app;
}
