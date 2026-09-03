import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { makeProduct, makeWarehouse, makeStockLevel } from "./factories.js";
describe("POST /api/warehouses", () => {
    it("creates a warehouse", async () => {
        const res = await request(app)
            .post("/api/warehouses")
            .send({ name: "Warehouse 1" });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ name: "Warehouse 1" });
        expect(res.body.id).toBeTypeOf("number");
    });

    it("trims whitespace off the name", async () => {
        const res = await request(app)
            .post("/api/warehouses")
            .send({ name: "  Warehouse 1  " });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe("Warehouse 1");
    });

    it("rejects an empty body", async () => {
        const res = await request(app).post("/api/warehouses").send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Validation failed");
        expect(res.body.details[0].field).toBe("name");
    });

    it("rejects an unknown key", async () => {
        const res = await request(app)
            .post("/api/warehouses")
            .send({ nmae: "Tools" });

        expect(res.status).toBe(400);
    });

    it("rejects a duplicate name with 409", async () => {
        await request(app).post("/api/warehouses").send({ name: "Warehouse 1" });
        const res = await request(app).post("/api/warehouses").send({ name: "Warehouse 1" });

        expect(res.status).toBe(409);
    });
});

describe("GET /api/warehouses/:id", () => {
    it("coerces a numeric id", async () => {
        const created = await request(app).post("/api/warehouses").send({ name: "Warehouse 1" });
        const res = await request(app).get(`/api/warehouses/${created.body.id}`);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Warehouse 1");
    });

    it("rejects a non-numeric id with 400", async () => {
        const res = await request(app).get("/api/warehouses/abc");
        expect(res.status).toBe(400);
    });

    it("returns 404 for an id that does not exist", async () => {
        const res = await request(app).get("/api/warehouses/999999");
        expect(res.status).toBe(404);
    });
});
describe("PATCH /api/warehouses/:id", () => {
    it("updates the location", async () => {
        const created = await request(app).post("/api/warehouses").send({ name: "Main" });
        const res = await request(app)
            .patch(`/api/warehouses/${created.body.id}`)
            .send({ location: "Giza" });

        expect(res.status).toBe(200);
        expect(res.body.location).toBe("Giza");
    });

    it("rejects an empty patch", async () => {
        const created = await request(app).post("/api/warehouses").send({ name: "Main" });
        const res = await request(app).patch(`/api/warehouses/${created.body.id}`).send({});

        expect(res.status).toBe(400);
    });
});

describe("GET /api/warehouses/:id/stock", () => {
    it("lists what is actually in the warehouse", async () => {
        const warehouse = await makeWarehouse();
        const a = await makeProduct();
        const b = await makeProduct();
        await makeStockLevel(a.id, warehouse.id, 40);
        await makeStockLevel(b.id, warehouse.id, 6);

        const res = await request(app).get(`/api/warehouses/${warehouse.id}/stock`);

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.meta.total).toBe(2);

        const byProduct = Object.fromEntries(res.body.data.map((l) => [l.product.name, l.quantity]));
        expect(byProduct[a.name]).toBe(40);
        expect(byProduct[b.name]).toBe(6);
    });

    // An empty warehouse is an empty list, not a 404. Only a missing warehouse 404s.
    it("returns an empty list for a warehouse holding nothing", async () => {
        const warehouse = await makeWarehouse();
        const res = await request(app).get(`/api/warehouses/${warehouse.id}/stock`);

        expect(res.status).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.meta.total).toBe(0);
    });

    it("404s for a warehouse that does not exist", async () => {
        const res = await request(app).get("/api/warehouses/999999/stock");
        expect(res.status).toBe(404);
    });
});

describe("GET /api/warehouses", () => {
    it("paginates and reports the total", async () => {
        for (const n of [1, 2, 3]) await makeWarehouse({ name: `Paged-${n}` });

        const res = await request(app).get("/api/warehouses?limit=2");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3 });
    });
});
