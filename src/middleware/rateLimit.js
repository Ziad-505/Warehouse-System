import rateLimit from "express-rate-limit";
import { AppError } from "../lib/AppError.js";
import { env } from "../lib/env.js";

// Routing 429s through AppError keeps every error in this API the same JSON
// shape. express-rate-limit's default response is plain text.
const tooMany = (message) => (req, res, next) => next(new AppError(429, message));

const common = {
    standardHeaders: "draft-7",   // RateLimit-* headers, so clients can back off
    legacyHeaders: false,
    // 82 tests hammering these endpoints would trip every limit. The limiter is
    // the thing under test only in the tests written for it.
    skip: () => env.NODE_ENV === "test",
};

export const apiLimiter = rateLimit({
    ...common,
    windowMs: 60_000,
    limit: 300,
    handler: tooMany("Too many requests, please slow down"),
});

// Login is the expensive endpoint: every attempt costs ~100ms of deliberate
// argon2 work. That makes it both a brute-force target AND a cheap way for one
// client to pin your CPU. skipSuccessfulRequests means normal users never see
// it -- only someone guessing burns through the budget.
export const authLimiter = rateLimit({
    ...common,
    windowMs: 15 * 60_000,
    limit: 10,
    skipSuccessfulRequests: true,
    handler: tooMany("Too many authentication attempts, try again later"),
});
