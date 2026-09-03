import { describe, it, expect } from "vitest";
import { api } from "./helpers.js";
import { prisma } from "../src/lib/prisma.js";
import { makeProduct, makeWarehouse, makeStockLevel } from "./factories.js";

const levelFor = (productId, warehouseId) =>
    prisma.stockLevel.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
    });

// The service sorts its writes by warehouseId to avoid deadlock, so a test that
// wants to control whether the OUT or the IN runs first needs to know which
// warehouse actually got the lower id. Create them sequentially (Promise.all
// races the inserts and the ids can come back either way round), then sort.
const setup = async () => {
    const product = await makeProduct();
    const w1 = await makeWarehouse();
    const w2 = await makeWarehouse();
    const [low, high] = [w1, w2].sort((a, b) => a.id - b.id);
    return { product, low, high };
};

describe("POST /api/stock-movements/transfer", () => {
    it("moves stock from one warehouse to another", async () => {
        const { product, low, high } = await setup();
        await makeStockLevel(product.id, low.id, 40);

        const res = await api().post("/api/stock-movements/transfer").send({
            productId: product.id,
            fromWarehouseId: low.id,
            toWarehouseId: high.id,
            quantity: 10,
        });

        expect(res.status).toBe(201);
        expect((await levelFor(product.id, low.id)).quantity).toBe(30);
        expect((await levelFor(product.id, high.id)).quantity).toBe(10);
    });

    it("writes one OUT and one IN movement", async () => {
        const { product, low, high } = await setup();
        await makeStockLevel(product.id, low.id, 40);

        await api().post("/api/stock-movements/transfer").send({
            productId: product.id,
            fromWarehouseId: low.id,
            toWarehouseId: high.id,
            quantity: 10,
        });

        const movements = await prisma.stockMovement.findMany({
            where: { productId: product.id },
            orderBy: { id: "asc" },
        });

        expect(movements).toHaveLength(2);
        expect(movements.map((m) => m.type).sort()).toEqual(["IN", "OUT"]);

        const out = movements.find((m) => m.type === "OUT");
        expect(out.warehouseId).toBe(low.id);
        expect(out.quantityBefore).toBe(40);
        expect(out.quantityAfter).toBe(30);

        const into = movements.find((m) => m.type === "IN");
        expect(into.warehouseId).toBe(high.id);
        expect(into.quantityBefore).toBe(0);
        expect(into.quantityAfter).toBe(10);
    });

    // The important one. Because writes are ordered by warehouseId, transferring
    // from the HIGHER id to the LOWER one runs the IN first -- so the rollback has
    // real work to undo. A 409 alone would not prove the source was left alone.
    it("leaves both warehouses untouched when the source has too little", async () => {
        const { product, low, high } = await setup();
        await makeStockLevel(product.id, high.id, 6);

        const res = await api().post("/api/stock-movements/transfer").send({
            productId: product.id,
            fromWarehouseId: high.id,
            toWarehouseId: low.id,
            quantity: 999999,
        });

        expect(res.status).toBe(409);
        expect((await levelFor(product.id, high.id)).quantity).toBe(6);
        expect(await levelFor(product.id, low.id)).toBeNull();
        expect(await prisma.stockMovement.count({ where: { productId: product.id } })).toBe(0);
    });

    it("rejects a transfer to the same warehouse", async () => {
        const { product, low } = await setup();
        await makeStockLevel(product.id, low.id, 40);

        const res = await api().post("/api/stock-movements/transfer").send({
            productId: product.id,
            fromWarehouseId: low.id,
            toWarehouseId: low.id,
            quantity: 5,
        });

        expect(res.status).toBe(400);
        expect(res.body.details.some((d) => d.field === "toWarehouseId")).toBe(true);
    });

    it("404s on an unknown destination warehouse", async () => {
        const { product, low } = await setup();
        await makeStockLevel(product.id, low.id, 40);

        const res = await api().post("/api/stock-movements/transfer").send({
            productId: product.id,
            fromWarehouseId: low.id,
            toWarehouseId: 999999,
            quantity: 5,
        });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Destination warehouse not found");
    });
});
