import { z } from "zod";

export const idParam = z.object({
    id: z.coerce.number().int().positive(),
});

// Every list endpoint takes the same shape, so it lives here rather than being
// copied per resource. `limit` is capped: without it a client can ask the
// database to serialise an entire table into one response.
export const listQuery = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().min(1).optional(),
});
