import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// A health check that returns 200 while the database is unreachable is worse
// than none: it tells the load balancer to keep sending traffic to an instance
// that cannot serve it. 503 means "not me right now", which is what a balancer
// needs to hear to route elsewhere.
router.get("/", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "ok", database: "up" });
    } catch (error) {
        req.log?.error({ err: error }, "health check failed");
        res.status(503).json({ status: "degraded", database: "down" });
    }
});

export default router;
