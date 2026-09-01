import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";

if (!process.env.DATABASE_URL?.includes("warehouse_test")) {
    throw new Error("Refusing to run tests: DATABASE_URL is not the test database");
}


beforeEach(async () => {
    await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "StockMovement", "Product", "Category", "Warehouse" RESTART IDENTITY CASCADE'
    );
});

afterAll(async () => {
    await prisma.$disconnect();
});