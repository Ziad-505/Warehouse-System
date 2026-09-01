import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { makeCategory, makeWarehouse } from "./factories.js";

describe("POST /api/products", () => {
    it("creates a product", async () => {
        const res = await request(app)
            .post("/api/products")
            .send({ name: "Hammer", price: 99.5, quantity: 10 });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ name: "Hammer", quantity: 10 });
        expect(res.body.id).toBeTypeOf("number");
        // Prisma serialises Decimal as a string, so compare numerically rather
        // than guessing between "99.5" and "99.50".
        expect(Number(res.body.price)).toBe(99.5);
    });

    it("links a product to a category and a warehouse", async () => {
        const category = await makeCategory();
        const warehouse = await makeWarehouse();

        const res = await request(app)
            .post("/api/products")
            .send({ name: "Screwdriver", price: 45, categoryId: category.id, warehouseId: warehouse.id });

        expect(res.status).toBe(201);
        expect(res.body.categoryId).toBe(category.id);
        expect(res.body.warehouseId).toBe(warehouse.id);
    });

    it("defaults quantity to 0", async () => {
        const res = await request(app).post("/api/products").send({ name: "Packing Tape", price: 12.75 });

        expect(res.status).toBe(201);
        expect(res.body.quantity).toBe(0);
    });

    it("trims whitespace off the name", async () => {
        const res = await request(app).post("/api/products").send({ name: "  Hammer  ", price: 10 });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe("Hammer");
    });

    it("rejects an empty body", async () => {
        const res = await request(app).post("/api/products").send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Validation failed");
    });

    it("rejects an unknown key", async () => {
        const res = await request(app)
            .post("/api/products")
            .send({ name: "Hammer", price: 10, description: "not a column" });

        expect(res.status).toBe(400);
    });

    it("rejects a negative price", async () => {
        const res = await request(app).post("/api/products").send({ name: "Hammer", price: -5 });

        expect(res.status).toBe(400);
    });

    // Shape rules live in the schema; this one is a state rule, so the service
    // owns it and it needs a database round trip.
    it("rejects a categoryId that does not exist", async () => {
        const res = await request(app)
            .post("/api/products")
            .send({ name: "Hammer", price: 10, categoryId: 999999 });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Category not found");
    });

    it("rejects a duplicate name with 409", async () => {
        await request(app).post("/api/products").send({ name: "Hammer", price: 10 });
        const res = await request(app).post("/api/products").send({ name: "Hammer", price: 10 });

        expect(res.status).toBe(409);
    });
});

describe("GET /api/products/:id", () => {
    it("coerces a numeric id", async () => {
        const created = await request(app).post("/api/products").send({ name: "Hammer", price: 10 });
        const res = await request(app).get(`/api/products/${created.body.id}`);

        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Hammer");
    });

    it("rejects a non-numeric id with 400", async () => {
        const res = await request(app).get("/api/products/abc");
        expect(res.status).toBe(400);
    });

    it("returns 404 for an id that does not exist", async () => {
        const res = await request(app).get("/api/products/999999");
        expect(res.status).toBe(404);
    });
});

describe("PATCH /api/products/:id", () => {
    it("updates the name", async () => {
        const created = await request(app).post("/api/products").send({ name: "Hammer", price: 10 });
        const res = await request(app)
            .patch(`/api/products/${created.body.id}`)
            .send({ name: "Sledgehammer" });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Sledgehammer");
    });

    // quantity is omitted from the update schema on purpose: stock only moves
    // through /api/stock-movements, so the audit trail stays complete.
    it("rejects quantity", async () => {
        const created = await request(app).post("/api/products").send({ name: "Hammer", price: 10 });
        const res = await request(app)
            .patch(`/api/products/${created.body.id}`)
            .send({ quantity: 500 });

        expect(res.status).toBe(400);
    });

    it("rejects an empty patch", async () => {
        const created = await request(app).post("/api/products").send({ name: "Hammer", price: 10 });
        const res = await request(app).patch(`/api/products/${created.body.id}`).send({});

        expect(res.status).toBe(400);
    });
});
