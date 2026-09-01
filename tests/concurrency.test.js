import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { makeProduct } from "./factories.js";

describe("concurrent stock movements", () => {
    it("never oversells", async () => {
        const product = await makeProduct({ quantity: 10 });

        // 20 simultaneous requests, each taking 1 unit, against 10 in stock.
        const responses = await Promise.all(
            Array.from({ length: 20 }, () =>
                request(app)
                    .post("/api/stock-movements")
                    .send({ productId: product.id, type: "OUT", quantity: 1 })
            )
        );

        const accepted = responses.filter((r) => r.status === 201);
        const refused = responses.filter((r) => r.status === 409);

        expect(accepted).toHaveLength(10);
        expect(refused).toHaveLength(10);

        // The invariant that actually matters: stock never goes negative.
        const after = await prisma.product.findUnique({ where: { id: product.id } });
        expect(after.quantity).toBe(0);

        // And no phantom audit rows for the movements that were refused.
        const movements = await prisma.stockMovement.count({
            where: { productId: product.id },
        });
        expect(movements).toBe(10);
    });
});