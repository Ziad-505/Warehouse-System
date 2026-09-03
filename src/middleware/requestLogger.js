import pinoHttp from "pino-http";
import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger.js";

export const requestLogger = pinoHttp({
    logger,

    // Accept an id a proxy or upstream service already set, otherwise mint one.
    // This is what lets you follow a single request across several services --
    // grep one id and you have the whole story.
    genReqId: (req, res) => {
        const existing = req.headers["x-request-id"];
        const id = existing ?? randomUUID();
        res.setHeader("x-request-id", id);
        return id;
    },

    // A 404 is not an error worth paging someone about; a 500 is.
    customLogLevel: (req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },

    // requireAuth has already run by the time the response is logged, so every
    // line can say who made the request.
    customProps: (req) => ({ userId: req.user?.id }),
});
