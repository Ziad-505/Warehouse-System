import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/AppError.js";

const levelKey = (productId, warehouseId) => ({
    productId_warehouseId: { productId, warehouseId },
});

const assertProduct = async (tx, productId) => {
    const product = await tx.product.findFirst({ where: { id: productId, deletedAt: null } });
    if (!product) throw new AppError(404, "Product not found");
};

const assertWarehouse = async (tx, warehouseId, message = "Warehouse not found") => {
    const warehouse = await tx.warehouse.findFirst({ where: { id: warehouseId, deletedAt: null } });
    if (!warehouse) throw new AppError(404, message);
};

/**
 * Applies one stock change to one (product, warehouse) pair and records the
 * movement. Runs inside a caller-supplied transaction so a transfer can call it
 * twice and have both halves commit or neither.
 */
const applyMovement = async (tx, { productId, warehouseId, type, quantity, reason }) => {
    const key = levelKey(productId, warehouseId);

    const existing = await tx.stockLevel.findUnique({ where: key });
    const quantityBefore = existing?.quantity ?? 0;

    if (type === "OUT") {
        // The WHERE carries the check, so Postgres re-evaluates it after the row
        // lock is released. Never read-then-write.
        const { count } = await tx.stockLevel.updateMany({
            where: { productId, warehouseId, quantity: { gte: quantity } },
            data: { quantity: { decrement: quantity } },
        });
        if (count === 0) throw new AppError(409, "Insufficient stock");
    } else {
        // IN and ADJUST may be the first movement for this pair.
        await tx.stockLevel.upsert({
            where: key,
            create: { productId, warehouseId, quantity },
            update: type === "IN" ? { quantity: { increment: quantity } } : { quantity },
        });
    }

    const level = await tx.stockLevel.findUnique({ where: key });

    const movement = await tx.stockMovement.create({
        data: {
            type,
            quantity,
            reason,
            productId,
            warehouseId,
            quantityBefore,
            quantityAfter: level.quantity,
        },
    });

    return { movement, quantity: level.quantity };
};

export const createStockMovement = async ({ productId, warehouseId, type, quantity, reason }) =>
    prisma.$transaction(async (tx) => {
        await assertProduct(tx, productId);
        await assertWarehouse(tx, warehouseId);
        return applyMovement(tx, { productId, warehouseId, type, quantity, reason });
    });

export const transferStock = async ({ productId, fromWarehouseId, toWarehouseId, quantity, reason }) =>
    prisma.$transaction(async (tx) => {
        await assertProduct(tx, productId);
        await assertWarehouse(tx, fromWarehouseId, "Source warehouse not found");
        await assertWarehouse(tx, toWarehouseId, "Destination warehouse not found");

        const ops = [
            { warehouseId: fromWarehouseId, type: "OUT" },
            { warehouseId: toWarehouseId, type: "IN" },
        ].sort((a, b) => a.warehouseId - b.warehouseId);

        const applied = {};
        for (const op of ops) {
            applied[op.type] = await applyMovement(tx, {
                productId,
                warehouseId: op.warehouseId,
                type: op.type,
                quantity,
                reason,
            });
        }

        // If the OUT threw, the IN above it is rolled back with the transaction.
        return {
            from: { warehouseId: fromWarehouseId, quantity: applied.OUT.quantity, movement: applied.OUT.movement },
            to: { warehouseId: toWarehouseId, quantity: applied.IN.quantity, movement: applied.IN.movement },
        };
    });
