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
const applyMovement = async (tx, { productId, warehouseId, type, quantity, reason, userId }) => {
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
            userId,
            quantityBefore,
            quantityAfter: level.quantity,
        },
    });

    return { movement, quantity: level.quantity };
};

export const createStockMovement = async ({ productId, warehouseId, type, quantity, reason, userId }) =>
    prisma.$transaction(async (tx) => {
        await assertProduct(tx, productId);
        await assertWarehouse(tx, warehouseId);
        return applyMovement(tx, { productId, warehouseId, type, quantity, reason, userId });
    });

export const transferStock = async ({ productId, fromWarehouseId, toWarehouseId, quantity, reason, userId }) =>
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
                userId,
            });
        }

        // If the OUT threw, the IN above it is rolled back with the transaction.
        return {
            from: { warehouseId: fromWarehouseId, quantity: applied.OUT.quantity, movement: applied.OUT.movement },
            to: { warehouseId: toWarehouseId, quantity: applied.IN.quantity, movement: applied.IN.movement },
        };
    });

export const getMovements = async ({ page, limit, productId, warehouseId, userId, type, from, to }) => {
    // Prisma drops `undefined` filters entirely, so one object covers every
    // combination of these four with no conditionals. That is the same rule
    // that made `id: undefined` silently match everything in Stage 3 -- here it
    // is exactly what we want.
    const where = {
        productId,
        warehouseId,
        userId,
        type,
        // createdAt needs the spread: { gte: undefined, lte: undefined } is an
        // empty filter OBJECT, not an absent one, and Prisma rejects it.
        ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
    };

    const [data, total] = await Promise.all([
        prisma.stockMovement.findMany({
            where,
            include: {
                product: { select: { id: true, name: true } },
                warehouse: { select: { id: true, name: true } },
                user: { select: { id: true, email: true } },
            },
            // A transfer writes both its movements inside one transaction, so
            // their createdAt values tie. Without `id` as a second key the order
            // is undefined and rows can repeat or vanish across pages.
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.stockMovement.count({ where }),
    ]);

    return { data, meta: { page, limit, total } };
};
