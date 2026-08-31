import { z } from "zod";

const base = {
    productId: z.coerce.number().int().positive(),
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