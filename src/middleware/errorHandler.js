import { AppError } from "../lib/AppError.js";

export const notFoundHandler = (req, res, next) => {
    next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    if (err instanceof AppError) {
        return res.status(err.status).json({
            error: err.message,
            ...(err.details ? { details: err.details } : {}),
        });
    }

    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ error: "Malformed JSON in request body" });
    }

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

    console.error("[error]", req.method, req.originalUrl, err);
    res.status(500).json({ error: "Internal server error" });
};
