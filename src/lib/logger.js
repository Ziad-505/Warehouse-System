import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
    // Tests should not print a log line per request.
    level: env.NODE_ENV === "test" ? "silent" : env.LOG_LEVEL,

    // Anything listed here is replaced with [Redacted] before it is written.
    // Without this the Authorization header lands in your log aggregator on
    // every single request -- which means your access tokens do too.
    redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.password",
        "*.passwordHash",
        "*.refreshToken",
        "*.accessToken",
    ],
});
