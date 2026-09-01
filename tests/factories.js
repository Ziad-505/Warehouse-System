import { prisma } from "../src/lib/prisma.js";

// A fresh record every call. Names are unique so the @unique constraint on
// `name` never fires by accident in a test that is not about duplicates.
let counter = 0;
const unique = (prefix) => `${prefix}-${++counter}`;

export const makeCategory = (overrides = {}) =>
    prisma.category.create({
        data: { name: unique("Category"), ...overrides },
    });

export const makeWarehouse = (overrides = {}) =>
    prisma.warehouse.create({
        data: { name: unique("Warehouse"), location: "Cairo", ...overrides },
    });

export const makeProduct = (overrides = {}) =>
    prisma.product.create({
        data: { name: unique("Product"), price: "10.00", quantity: 0, ...overrides },
    });
