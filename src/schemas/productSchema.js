import { z } from "zod";
import { idParam } from "./common.js";


export const productIdParam = idParam;

export const createProductBody = z.strictObject({
    name: z.string().trim().min(1, "name is required").max(150),
    price: z.coerce.number().positive().max(99999999.99),
    quantity: z.coerce.number().int().nonnegative().default(0),
    categoryId: z.coerce.number().int().positive().nullish(),
    warehouseId: z.coerce.number().int().positive().nullish(),
});

export const updateProductBody = createProductBody
    .omit({ quantity: true })
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "Provide at least one field to update",
    });