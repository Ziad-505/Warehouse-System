import { z } from "zod";
import { idParam } from "./common.js";


export const categoryIdParam = idParam;

export const createCategoryBody = z.strictObject({
    name: z.string().trim().min(1, "name is required").max(100),
});

export const updateCategoryBody = createCategoryBody
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "Provide at least one field to update",
    });


export const listQuery = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().min(1).optional(),
});    