import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { signAccessToken } from "../src/lib/tokens.js";

if (!process.env.DATABASE_URL?.includes("warehouse_test")) {
    throw new Error("Refusing to run tests: DATABASE_URL is not the test database");
}

beforeEach(async () => {
    await prisma.$executeRawUnsafe(
        'TRUNCATE TABLE "RefreshToken", "StockMovement", "StockLevel", "Product", "Category", "Warehouse", "User" RESTART IDENTITY CASCADE'
    );

    // Most tests are not about auth, so they get a default admin. Tests that
    // care about roles create their own user with makeUser().
    const admin = await prisma.user.create({
        data: { email: "admin@test.local", passwordHash: "x-not-a-valid-hash", role: "ADMIN" },
    });
    globalThis.__ADMIN_TOKEN__ = signAccessToken(admin);
    globalThis.__ADMIN_ID__ = admin.id;
});

afterAll(async () => {
    await prisma.$disconnect();
});
