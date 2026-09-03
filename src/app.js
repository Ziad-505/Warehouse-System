import express from "express";
import helmet from "helmet";
import cors from "cors";

import { env } from "./lib/env.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { apiLimiter, authLimiter } from "./middleware/rateLimit.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

import healthRouter from "./routes/healthRouter.js";
import docsRouter from "./routes/docsRouter.js";
import authRouter from "./routes/authRouter.js";
import categoryRouter from "./routes/categoryRouter.js";
import warehouseRouter from "./routes/warehouseRouter.js";
import productRouter from "./routes/productRouter.js";
import stockMovementRouter from "./routes/stockMovementRouter.js";

const app = express();

// Behind a proxy, the client IP is in X-Forwarded-For. Without this the rate
// limiter sees every request as coming from the proxy and throttles everyone
// together. "1" = trust exactly one hop, which is the usual deployment.
app.set("trust proxy", 1);

// Sets a dozen defensive response headers -- no MIME sniffing, no framing, a
// strict referrer policy, HSTS. Cheap, and each one closes a real class of bug.
app.use(helmet());

app.use(
    cors({
        origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
        credentials: true,
    })
);

// Logging goes early so even rejected requests are recorded.
app.use(requestLogger);

// An explicit cap. Without one, a single large body can occupy memory while
// being parsed, before any of your code gets a say.
app.use(express.json({ limit: "100kb" }));

app.use("/api", apiLimiter);

app.use("/api/health", healthRouter);

// Public by choice: this repo is meant to be read. On a private API you
// would gate this behind auth or an env flag.
app.use("/api/docs", docsRouter);

// Public: you cannot present a token before you have one. The stricter limiter
// sits here because these are the endpoints worth guessing against.
app.use("/api/auth", authLimiter, authRouter);

app.use("/api/categories", categoryRouter);
app.use("/api/warehouses", warehouseRouter);
app.use("/api/products", productRouter);
app.use("/api/stock-movements", stockMovementRouter);

// Order below is not stylistic. Express runs middleware top to bottom, so the
// 404 must sit after every route, and the error handler must be dead last.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
