import { z } from "zod";
import { idParam, listQuery } from "./common.js";


export const categoryIdParam = idParam;

export const createCategoryBody = z.strictObject({
    name: z.string().trim().min(1, "name is required").max(100),
});

export const updateCategoryBody = createCategoryBody
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "Provide at least one field to update",
    });

export const categoryListQuery = listQuery;
