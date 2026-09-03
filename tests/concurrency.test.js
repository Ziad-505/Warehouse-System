import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { makeStockedProduct, makeProduct, makeWarehouse } from "./factories.js";

const levelFor = (productId, warehouseId) =>
    prisma.stockLevel.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
    });

describe("concurrent stock movements", () => {
    it("never oversells", async () => {
        const { product, warehouse } = await makeStockedProduct(10);

        // 20 simultaneous requests, each taking 1 unit, against 10 in stock.
        const responses = await Promise.all(
            Array.from({ length: 20 }, () =>
                request(app)
                    .post("/api/stock-movements")
                    .send({ productId: product.id, warehouseId: warehouse.id, type: "OUT", quantity: 1 })
            )
        );

        expect(responses.filter((r) => r.status === 201)).toHaveLength(10);
        expect(responses.filter((r) => r.status === 409)).toHaveLength(10);

        // The invariant that actually matters: stock never goes negative.
        const after = await levelFor(product.id, warehouse.id);
        expect(after.quantity).toBe(0);

        // And no phantom audit rows for the movements that were refused.
        const movements = await prisma.stockMovement.count({ where: { productId: product.id } });
        expect(movements).toBe(10);
    });

    it("keeps two warehouses independent", async () => {
        const product = await makeProduct();
        const [a, b] = await Promise.all([makeWarehouse(), makeWarehouse()]);

        await request(app).post("/api/stock-movements")
            .send({ productId: product.id, warehouseId: a.id, type: "IN", quantity: 5 });
        await request(app).post("/api/stock-movements")
            .send({ productId: product.id, warehouseId: b.id, type: "IN", quantity: 30 });

        expect((await levelFor(product.id, a.id)).quantity).toBe(5);
        expect((await levelFor(product.id, b.id)).quantity).toBe(30);
    });

    // The upsert path is new in Stage 3: IN may have to CREATE the stock level.
    // Two concurrent INs can both find nothing and both try to insert, which the
    // composite primary key would reject as P2002 -> a 409 for a valid request.
    // This test exists to find out whether that actually happens.
    it("handles concurrent IN movements against a pair with no stock level", async () => {
        const product = await makeProduct();
        const warehouse = await makeWarehouse();

        const responses = await Promise.all(
            Array.from({ length: 20 }, () =>
                request(app)
                    .post("/api/stock-movements")
                    .send({ productId: product.id, warehouseId: warehouse.id, type: "IN", quantity: 1 })
            )
        );

        expect(responses.filter((r) => r.status === 201)).toHaveLength(20);
        expect((await levelFor(product.id, warehouse.id)).quantity).toBe(20);
    });
});
