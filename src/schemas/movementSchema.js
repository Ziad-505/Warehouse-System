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
// A dedicated list schema rather than the shared listQuery: `search` means
// nothing on a movement, and these filters map onto the three composite
// indexes built in Stage 3.
export const movementListQuery = z
    .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        productId: z.coerce.number().int().positive().optional(),
        warehouseId: z.coerce.number().int().positive().optional(),
        userId: z.coerce.number().int().positive().optional(),
        type: z.enum(["IN", "OUT", "ADJUST"]).optional(),
        from: z.coerce.date().optional(),
        to: z.coerce.date().optional(),
    })
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
        message: "from must be before to",
        path: ["to"],
    });
