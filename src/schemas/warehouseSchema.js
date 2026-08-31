import { z } from "zod";
import { idParam } from "./common.js";


export const warehouseIdParam = idParam;

export const createWarehouseBody = z.strictObject({
    name: z.string().trim().min(1, "name is required").max(100),
    location: z.string().trim().max(200).optional(),
});

export const updateWarehouseBody = createWarehouseBody
    .partial()
    .refine((data) => Object.keys(data).length > 0, {
        message: "Provide at least one field to update",
    });