import winston from "winston";

/**
 * Structured JSON logs. Уровни: debug/info/warn/error.
 * Каждый запись — одна JSON-строка (уровень, сообщение, мета, stack).
 */
export const logger = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
    ),
    transports: [new winston.transports.Console()],
    exitOnError: false,
});
