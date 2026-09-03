import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { buildOpenApiDocument } from "../docs/openapi.js";

const router = Router();

// Built once at startup: the schemas cannot change at runtime, and rebuilding
// per request would be pure waste.
const document = buildOpenApiDocument();

// helmet's default Content-Security-Policy blocks the inline styles and scripts
// Swagger UI ships with, so the page renders blank. Relaxing it here rather than
// globally keeps the strict policy on every route that actually matters.
router.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    })
);

// The raw document, for client generators and contract tests.
router.get("/openapi.json", (req, res) => res.json(document));

router.use(
    "/",
    swaggerUi.serve,
    swaggerUi.setup(document, { customSiteTitle: "Warehouse System API" })
);

export default router;
