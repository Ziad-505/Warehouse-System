import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/AppError.js";

export const createStockMovement = async ({ productId, type, quantity, reason }) => {
    return prisma.$transaction(async (tx) => {
        const product = await tx.product.findFirst({ where: { id: productId, deletedAt: null } });
        if (!product) throw new AppError(404, "Product not found");

        const updates = {
            IN:     { where: { id: productId, deletedAt: null }, data: { quantity: { increment: quantity } } },
            OUT:    { where: { id: productId, deletedAt: null, quantity: { gte: quantity } }, data: { quantity: { decrement: quantity } } },
            ADJUST: { where: { id: productId, deletedAt: null }, data: { quantity } },
        };

        const { count } = await tx.product.updateMany(updates[type]);
        if (count === 0) throw type === "OUT"
            ? new AppError(409, "Insufficient stock")
            : new AppError(404, "Product not found");

        const movement = await tx.stockMovement.create({ data: { type, quantity, reason, productId } });
        const { quantity: newQuantity } = await tx.product.findUnique({ where: { id: productId }, select: { quantity: true } });

        return { movement, quantity: newQuantity };
    });
};
