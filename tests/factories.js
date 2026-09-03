import { prisma } from "../src/lib/prisma.js";
import { signAccessToken } from "../src/lib/tokens.js";
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

// Products no longer carry a quantity -- stock lives on the product/warehouse pair.
export const makeProduct = (overrides = {}) =>
    prisma.product.create({
        data: { name: unique("Product"), price: "10.00", ...overrides },
    });

export const makeStockLevel = (productId, warehouseId, quantity = 0) =>
    prisma.stockLevel.create({
        data: { productId, warehouseId, quantity },
    });

// The common case: a product sitting in a warehouse with some stock.
export const makeStockedProduct = async (quantity = 0) => {
    const [product, warehouse] = await Promise.all([makeProduct(), makeWarehouse()]);
    await makeStockLevel(product.id, warehouse.id, quantity);
    return { product, warehouse };
};

// Signs the token directly from the secret rather than going through
// /auth/login. Setup should not depend on the endpoint under test -- if login
// breaks you want the login tests to fail, not every test in the suite.
export const makeUser = async (role = "ADMIN") => {
    const user = await prisma.user.create({
        data: {
            email: `${unique("user")}@example.com`,
            passwordHash: "x-not-a-valid-argon2-hash",
            role,
        },
    });
    return { user, token: signAccessToken(user) };
};
