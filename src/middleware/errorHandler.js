import { AppError } from "../lib/AppError.js";
import { logger } from "../lib/logger.js";

export const notFoundHandler = (req, res, next) => {
    next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    // 1. Errors we raised deliberately.
    if (err instanceof AppError) {
        return res.status(err.status).json({
            error: err.message,
            ...(err.details ? { details: err.details } : {}),
        });
    }

    // 2. Malformed JSON, thrown by express.json() before any route runs. Kept
    //    ahead of the generic rule below only because the message is friendlier
    //    than body-parser's "Unexpected end of JSON input".
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Malformed JSON in request body" });
    }

    // 3. body-parser -- and anything else built on the `http-errors` convention
    //    -- already carries the correct status and an `expose` flag saying the
    //    message is safe to show a client. Honouring that beats special-casing
    //    them one at a time: this single rule covers entity.too.large (413),
    //    encoding.unsupported (415), request.aborted (400) and the rest.
    if (err.expose === true && Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
        return res.status(err.status).json({ error: err.message });
    }

    // 4. Prisma "known request errors" carry a documented, stable code.
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

    // 5. Anything else is unexpected: log everything, leak nothing. req.log
    //    carries the request id, so this line ties back to the access-log line
    //    for the same request.
    (req.log ?? logger).error({ err, method: req.method, url: req.originalUrl }, "unhandled error");
    res.status(500).json({ error: "Internal server error" });
};
