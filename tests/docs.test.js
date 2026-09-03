import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { buildOpenApiDocument, conversionErrors } from "../src/docs/openapi.js";

describe("API documentation", () => {
    // The builder swallows conversion failures so bad docs can never take the
    // API down. This is the test that stops that safety net hiding a problem.
    it("converts every Zod schema without falling back", () => {
        buildOpenApiDocument();
        expect(conversionErrors).toEqual([]);
    });

    it("serves the OpenAPI document without a token", async () => {
        const res = await request(app).get("/api/docs/openapi.json");

        expect(res.status).toBe(200);
        expect(res.body.openapi).toBe("3.1.0");
        expect(res.body.info.title).toBe("Warehouse System API");
    });

    it("documents every endpoint the app actually mounts", async () => {
        const res = await request(app).get("/api/docs/openapi.json");
        const paths = Object.keys(res.body.paths);

        for (const expected of [
            "/api/health",
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/refresh",
            "/api/auth/logout",
            "/api/categories",
            "/api/categories/{id}",
            "/api/warehouses",
            "/api/warehouses/{id}",
            "/api/warehouses/{id}/stock",
            "/api/products",
            "/api/products/{id}",
            "/api/stock-movements",
            "/api/stock-movements/transfer",
        ]) {
            expect(paths).toContain(expected);
        }
    });

    it("marks auth and health as public and everything else as bearer-protected", async () => {
        const res = await request(app).get("/api/docs/openapi.json");

        expect(res.body.security).toEqual([{ bearerAuth: [] }]);
        expect(res.body.paths["/api/auth/login"].post.security).toEqual([]);
        expect(res.body.paths["/api/health"].get.security).toEqual([]);
        // No per-operation override means the document-level requirement applies.
        expect(res.body.paths["/api/categories"].get.security).toBeUndefined();
    });

    it("derives request bodies from the real Zod schemas", async () => {
        const res = await request(app).get("/api/docs/openapi.json");
        const login = res.body.paths["/api/auth/login"].post.requestBody
            .content["application/json"].schema;

        expect(login.properties.email).toBeDefined();
        expect(login.properties.password).toBeDefined();
        expect(login.required).toContain("email");
    });

    it("derives list filters from the query schemas", async () => {
        const res = await request(app).get("/api/docs/openapi.json");
        const names = res.body.paths["/api/stock-movements"].get.parameters.map((p) => p.name);

        expect(names).toEqual(expect.arrayContaining(["page", "limit", "productId", "warehouseId", "userId", "type"]));
    });

    it("renders the Swagger UI page", async () => {
        const res = await request(app).get("/api/docs/");

        expect(res.status).toBe(200);
        expect(res.text).toContain("Warehouse System API");
    });
});
