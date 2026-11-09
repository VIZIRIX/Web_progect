import winston from 'winston';

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let output = `${timestamp} [${level}]: ${message}`;

    if (Object.keys(metadata).length > 0) {
        output += ` JSON: ${JSON.stringify(metadata)}`;
    }

    if (stack) {
        output += `\nSTACK: ${stack}`;
    }

    return output;
});

export const logger = winston.createLogger({
    level: 'debug',
format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                errors({ stack: true })
),
transports: [
    new winston.transports.Console({
        format: combine(
            colorize(),
            consoleFormat
        )
    }),
],
exitOnError: false,
});
