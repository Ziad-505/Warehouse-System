import { describe, it, expect } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { api, anon } from "./helpers.js";
import { makeUser, makeProduct, makeWarehouse, makeStockLevel } from "./factories.js";

// Puts a known set of movements in the database by going through the API, so
// the rows look exactly like real ones -- including their userId.
const seedMovements = async () => {
    const { user, token } = await makeUser("STAFF");
    const product = await makeProduct();
    const other = await makeProduct();
    const warehouse = await makeWarehouse();

    await api(token).post("/api/stock-movements")
        .send({ productId: product.id, warehouseId: warehouse.id, type: "IN", quantity: 10 });
    await api(token).post("/api/stock-movements")
        .send({ productId: product.id, warehouseId: warehouse.id, type: "OUT", quantity: 3 });
    await api(token).post("/api/stock-movements")
        .send({ productId: other.id, warehouseId: warehouse.id, type: "IN", quantity: 7 });

    return { user, token, product, other, warehouse };
};

describe("GET /api/stock-movements", () => {
    it("requires a token", async () => {
        const res = await anon().get("/api/stock-movements");
        expect(res.status).toBe(401);
    });

    it("returns every movement, newest first", async () => {
        await seedMovements();
        const res = await api().get("/api/stock-movements");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(3);
        expect(res.body.meta.total).toBe(3);

        const ids = res.body.data.map((m) => m.id);
        expect(ids).toEqual([...ids].sort((a, b) => b - a));
    });

    it("names the product, warehouse and user on each row", async () => {
        const { user, product, warehouse } = await seedMovements();
        const res = await api().get(`/api/stock-movements?productId=${product.id}`);

        const row = res.body.data[0];
        expect(row.product.name).toBe(product.name);
        expect(row.warehouse.name).toBe(warehouse.name);
        expect(row.user.email).toBe(user.email);
        // The hash must not travel with the user, even nested two levels deep.
        expect(row.user.passwordHash).toBeUndefined();
    });

    it("filters by product", async () => {
        const { product } = await seedMovements();
        const res = await api().get(`/api/stock-movements?productId=${product.id}`);

        expect(res.body.data).toHaveLength(2);
        expect(res.body.data.every((m) => m.product.id === product.id)).toBe(true);
    });

    it("filters by type", async () => {
        await seedMovements();
        const res = await api().get("/api/stock-movements?type=OUT");

        expect(res.body.data).toHaveLength(1);
        expect(res.body.data[0].type).toBe("OUT");
    });

    it("filters by user", async () => {
        const { user } = await seedMovements();
        // A second person moves stock too.
        const someoneElse = await makeUser("STAFF");
        const product = await makeProduct();
        const warehouse = await makeWarehouse();
        await api(someoneElse.token).post("/api/stock-movements")
            .send({ productId: product.id, warehouseId: warehouse.id, type: "IN", quantity: 1 });

        const res = await api().get(`/api/stock-movements?userId=${user.id}`);

        expect(res.body.data).toHaveLength(3);
        expect(res.body.data.every((m) => m.user.id === user.id)).toBe(true);
    });

    it("filters by date range", async () => {
        await seedMovements();

        const future = await api().get("/api/stock-movements?from=2099-01-01");
        expect(future.body.data).toHaveLength(0);
        expect(future.body.meta.total).toBe(0);

        const past = await api().get("/api/stock-movements?from=2000-01-01");
        expect(past.body.data).toHaveLength(3);
    });

    it("rejects a range where from is after to", async () => {
        const res = await api().get("/api/stock-movements?from=2026-09-05&to=2026-09-01");

        expect(res.status).toBe(400);
        expect(res.body.details.some((d) => d.field === "to")).toBe(true);
    });

    it("rejects an unknown movement type", async () => {
        const res = await api().get("/api/stock-movements?type=SIDEWAYS");
        expect(res.status).toBe(400);
    });

    it("paginates", async () => {
        await seedMovements();
        const res = await api().get("/api/stock-movements?limit=2");

        expect(res.body.data).toHaveLength(2);
        expect(res.body.meta).toMatchObject({ page: 1, limit: 2, total: 3 });
    });

    // A transfer writes both movements inside one transaction, so their
    // createdAt values tie. Without `id` as a tiebreaker in orderBy, their
    // relative order is undefined and paging can repeat or drop a row.
    it("orders a transfer's two movements stably", async () => {
        const { token } = await makeUser("STAFF");
        const product = await makeProduct();
        const from = await makeWarehouse();
        const to = await makeWarehouse();
        await makeStockLevel(product.id, from.id, 40);

        await api(token).post("/api/stock-movements/transfer")
            .send({ productId: product.id, fromWarehouseId: from.id, toWarehouseId: to.id, quantity: 10 });

        const first = await api().get(`/api/stock-movements?productId=${product.id}`);
        const second = await api().get(`/api/stock-movements?productId=${product.id}`);

        expect(first.body.data).toHaveLength(2);
        expect(first.body.data.map((m) => m.id)).toEqual(second.body.data.map((m) => m.id));

        // Paging through one at a time must see each row exactly once.
        const p1 = await api().get(`/api/stock-movements?productId=${product.id}&limit=1&page=1`);
        const p2 = await api().get(`/api/stock-movements?productId=${product.id}&limit=1&page=2`);
        expect(p1.body.data[0].id).not.toBe(p2.body.data[0].id);
    });

    it("lets a VIEWER read the audit trail", async () => {
        await seedMovements();
        const { token } = await makeUser("VIEWER");
        const res = await api(token).get("/api/stock-movements");

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveLength(3);
    });
});
