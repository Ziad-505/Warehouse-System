import { z } from "zod";

export const idParam = z.object({
    id: z.coerce.number().int().positive(),
});

export const createWarehouseBody = z.strictObject({
    name: z.string().trim().min(1, "name is required").max(100),
    location: z.string().trim().max(200).optional(),
});

export const updateWarehouseBody = createWarehouseBody
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "Provide at least one field to update",
    });