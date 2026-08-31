import { AppError } from "../lib/AppError.js";

/**
 * Registered after every route: if we get here, nothing matched the URL.
 * Without this, Express answers unknown routes with an HTML page, which is
 * wrong for a JSON API.
 */
export const notFoundHandler = (req, res, next) => {
    next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * The single place where an error becomes an HTTP response.
 *
 * The four parameters are load-bearing: Express checks `fn.length === 4` to
 * recognise an error handler. Do not remove `next` even though it looks unused.
 */
export const errorHandler = (err, req, res, next) => {
    // If the response already started streaming we cannot change the status
    // code any more. Hand it to Express, which will close the connection.
    if (res.headersSent) return next(err);

    // 1. Errors we raised deliberately.
    if (err instanceof AppError) {
        return res.status(err.status).json({
            error: err.message,
            ...(err.details ? { details: err.details } : {}),
        });
    }

    // 2. Malformed JSON, thrown by express.json() before any route runs.
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Malformed JSON in request body" });
    }

    // 3. Prisma "known request errors" carry a documented, stable code.
    //    Translate the handful we expect; everything else is a bug.
    if (err.code === "P2002") {
        const target = err.meta?.target;
        const field = Array.isArray(target) ? target.join(", ") : "value";
        return res.status(409).json({ error: `A record with this ${field} already exists` });
    }
    if (err.code === "P2025") {
        return res.status(404).json({ error: "Not found" });
    }
    if (err.code === "P2003") {
        return res.status(400).json({ error: "Related record does not exist" });
    }

    // 4. Anything else is unexpected: log everything, leak nothing.
    console.error("[error]", req.method, req.originalUrl, err);
    res.status(500).json({ error: "Internal server error" });
};
