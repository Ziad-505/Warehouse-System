import { describe, it, expect } from "vitest";
import { api } from "./helpers.js";
import { makeCategory, makeWarehouse, makeProduct, makeStockLevel } from "./factories.js";

describe("POST /api/products", () => {
    it("creates a product", async () => {
        const res = await api().post("/api/products").send({ name: "Hammer", price: 99.5 });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ name: "Hammer" });
        expect(res.body.id).toBeTypeOf("number");
        // Prisma serialises Decimal as a string, so compare numerically.
        expect(Number(res.body.price)).toBe(99.5);
    });

    it("starts a product with no stock anywhere", async () => {
        const res = await api().post("/api/products").send({ name: "Hammer", price: 10 });

        expect(res.status).toBe(201);
        expect(res.body.stockLevels).toEqual([]);
    });

    // Stock only moves through /api/stock-movements, so the audit trail is
    // complete. Accepting it here would let a client write stock with no record.
    it("rejects quantity", async () => {
        const res = await api().post("/api/products").send({ name: "Hammer", price: 10, quantity: 5 });
        expect(res.status).toBe(400);
    });

    it("rejects warehouseId", async () => {
        const warehouse = await makeWarehouse();
        const res = await api()
            .post("/api/products")
            .send({ name: "Hammer", price: 10, warehouseId: warehouse.id });
        expect(res.status).toBe(400);
    });

    it("links a product to a category", async () => {
        const category = await makeCategory();
        const res = await api()
            .post("/api/products")
            .send({ name: "Screwdriver", price: 45, categoryId: category.id });

        expect(res.status).toBe(201);
        expect(res.body.categoryId).toBe(category.id);
    });

    it("rejects a categoryId that does not exist", async () => {
        const res = await api()
            .post("/api/products")
            .send({ name: "Hammer", price: 10, categoryId: 999999 });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Category not found");
    });

    it("trims whitespace off the name", async () => {
        const res = await api().post("/api/products").send({ name: "  Hammer  ", price: 10 });
        expect(res.status).toBe(201);
        expect(res.body.name).toBe("Hammer");
    });

    it("rejects an empty body", async () => {
        const res = await api().post("/api/products").send({});
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("Validation failed");
    });

    it("rejects a negative price", async () => {
        const res = await api().post("/api/products").send({ name: "Hammer", price: -5 });
        expect(res.status).toBe(400);
    });

    it("rejects a duplicate name with 409", async () => {
        await api().post("/api/products").send({ name: "Hammer", price: 10 });
        const res = await api().post("/api/products").send({ name: "Hammer", price: 10 });
        expect(res.status).toBe(409);
    });
});

describe("GET /api/products/:id", () => {
    it("returns stock broken down by warehouse", async () => {
        const product = await makeProduct();
        const [a, b] = [await makeWarehouse(), await makeWarehouse()];
        await makeStockLevel(product.id, a.id, 40);
        await makeStockLevel(product.id, b.id, 6);

        const res = await api().get(`/api/products/${product.id}`);

        expect(res.status).toBe(200);
        expect(res.body.stockLevels).toHaveLength(2);

        const byWarehouse = Object.fromEntries(
            res.body.stockLevels.map((l) => [l.warehouse.name, l.quantity])
        );
        expect(byWarehouse[a.name]).toBe(40);
        expect(byWarehouse[b.name]).toBe(6);
    });

    it("rejects a non-numeric id with 400", async () => {
        const res = await api().get("/api/products/abc");
        expect(res.status).toBe(400);
    });

    it("returns 404 for an id that does not exist", async () => {
        const res = await api().get("/api/products/999999");
        expect(res.status).toBe(404);
    });
});

describe("GET /api/products", () => {
    it("paginates and reports the total", async () => {
        for (const n of [1, 2, 3]) await makeProduct({ name: `Paged-${n}` });

        const res = await api().get("/api/products?limit=2");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3 });
    });

    it("rejects a limit above the cap", async () => {
        const res = await api().get("/api/products?limit=5000");
        expect(res.status).toBe(400);
    });
});

describe("PATCH /api/products/:id", () => {
    it("updates the name", async () => {
        const product = await makeProduct();
        const res = await api().patch(`/api/products/${product.id}`).send({ name: "Sledgehammer" });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Sledgehammer");
    });

    it("rejects quantity", async () => {
        const product = await makeProduct();
        const res = await api().patch(`/api/products/${product.id}`).send({ quantity: 500 });
        expect(res.status).toBe(400);
    });

    it("rejects an empty patch", async () => {
        const product = await makeProduct();
        const res = await api().patch(`/api/products/${product.id}`).send({});
        expect(res.status).toBe(400);
    });
});
