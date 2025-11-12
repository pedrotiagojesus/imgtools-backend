import winston from 'winston';
import { env } from './env';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
);

// JSON format for production
const jsonFormat = winston.format.combine(
    logFormat,
    winston.format.json()
);

// Simple format for development
const simpleFormat = winston.format.combine(
    logFormat,
    winston.format.printf(({ timestamp, level, message, metadata }) => {
        const meta = metadata as Record<string, unknown>;
        const metaStr = Object.keys(meta).length > 0
            ? `\n${JSON.stringify(meta, null, 2)}`
            : '';
        return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}`;
    })
);

// Create logger instance
export const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT === 'json' ? jsonFormat : simpleFormat,
    transports: [
        // Console transport
        new winston.transports.Console({
            format: env.LOG_FORMAT === 'json' ? jsonFormat : winston.format.combine(
                winston.format.colorize(),
                simpleFormat
            )
        }),
        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            format: jsonFormat
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            format: jsonFormat
        })
    ],
    // Handle uncaught exceptions and rejections
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
            format: jsonFormat
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
            format: jsonFormat
        })
    ]
});

// Add stream for Morgan integration (if needed)
export const loggerStream = {
    write: (message: string) => {
        logger.info(message.trim());
    }
};
