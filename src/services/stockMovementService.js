import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/AppError.js";

const MOVEMENT_TYPES = ["IN", "OUT", "ADJUST"];

export const createStockMovement = async ({ productId, type, quantity, reason }) => {
    const id = Number(productId);
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, "Invalid productId");

    if (!MOVEMENT_TYPES.includes(type)) throw new AppError(400, "Invalid movement type");

    if (quantity === null || quantity === undefined || quantity === "") throw new AppError(400, "Quantity is required");
    const qty = Number(quantity);
    if (!Number.isInteger(qty)) throw new AppError(400, "Quantity must be an integer");
    if (type === "ADJUST" && qty < 0) throw new AppError(400, "Quantity cannot be negative");
    if (type !== "ADJUST" && qty <= 0) throw new AppError(400, "Quantity must be greater than zero");

    return prisma.$transaction(async (tx) => {
        const product = await tx.product.findFirst({ where: { id, deletedAt: null } });
        if (!product) throw new AppError(404, "Product not found");


        const updates = {
            IN: { where: { id, deletedAt: null }, data: { quantity: { increment: qty } } },
            OUT: { where: { id, deletedAt: null, quantity: { gte: qty } }, data: { quantity: { decrement: qty } } },
            ADJUST: { where: { id, deletedAt: null }, data: { quantity: qty } },
        };

        const { count } = await tx.product.updateMany(updates[type]);
        if (count === 0) throw type === "OUT"
            ? new AppError(409, "Insufficient stock")
            : new AppError(404, "Product not found");

        const movement = await tx.stockMovement.create({ data: { type, quantity: qty, reason, productId: id } });
        const { quantity: newQuantity } = await tx.product.findUnique({ where: { id }, select: { quantity: true } });

        return { movement, quantity: newQuantity };
    });
};
