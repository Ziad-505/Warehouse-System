import "dotenv/config";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import app from "./app.js";

const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "server listening");
});

let shuttingDown = false;

const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, "shutting down");

    // Stop accepting new connections. The callback fires once every in-flight
    // request has finished -- this is the difference between a clean deploy and
    // dropping whatever was mid-transaction.
    server.close(async () => {
        await prisma.$disconnect();
        logger.info("shutdown complete");
        process.exit(0);
    });

    // Never wait forever. Orchestrators SIGKILL after their own grace period, so
    // exiting on our own terms first is strictly better.
    setTimeout(() => {
        logger.error("forced shutdown after timeout");
        process.exit(1);
    }, 10_000).unref();
};

// SIGTERM is what Docker and Kubernetes send on stop or redeploy. SIGINT is
// Ctrl+C. Handling neither means dropping live requests on every deploy.
for (const signal of ["SIGTERM", "SIGINT"]) {
    process.on(signal, () => shutdown(signal));
}

process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "unhandled rejection");
    process.exit(1);
});

process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "uncaught exception");
    process.exit(1);
});
