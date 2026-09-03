import { z } from "zod";


const base = {
    productId: z.coerce.number().int().positive(),
    warehouseId: z.coerce.number().int().positive(),
    reason: z.string().trim().max(255).optional(),
};

export const createMovementBody = z.discriminatedUnion("type", [
    z.strictObject({
        ...base,
        type: z.literal("IN"),
        quantity: z.coerce.number().int().positive(),
    }),
    z.strictObject({
        ...base,
        type: z.literal("OUT"),
        quantity: z.coerce.number().int().positive(),
    }),
    z.strictObject({
        ...base,
        type: z.literal("ADJUST"),
        quantity: z.coerce.number().int().nonnegative(),
    }),
]);


export const transferBody = z.strictObject({
    productId: z.coerce.number().int().positive(),
    fromWarehouseId: z.coerce.number().int().positive(),
    toWarehouseId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    reason: z.string().trim().max(255).optional(),
}).refine((d) => d.fromWarehouseId !== d.toWarehouseId, {
    message: "Cannot transfer to the same warehouse",
    path: ["toWarehouseId"],
});