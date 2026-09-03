import { z } from "zod";
import { idParam, listQuery } from "./common.js";

export const productIdParam = idParam;
export const productListQuery = listQuery;

// quantity and warehouseId are gone: stock is a fact about a (product, warehouse)
// pair now, and it only changes through /api/stock-movements so the audit trail
// stays complete.
export const createProductBody = z.strictObject({
    name: z.string().trim().min(1, "name is required").max(150),
    price: z.coerce.number().positive().max(99999999.99),
    categoryId: z.coerce.number().int().positive().nullish(),
});

export const updateProductBody = createProductBody
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "Provide at least one field to update",
    });
