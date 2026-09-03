import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/AppError.js";

// Stock is no longer a column on Product, so every read that wants a quantity
// has to come through the join table.
const withStock = {
    category: true,
    stockLevels: {
        select: {
            quantity: true,
            warehouse: { select: { id: true, name: true } },
        },
    },
};

export const getAllProducts = async ({ page, limit, search }) => {
    const where = {
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const [data, total] = await Promise.all([
        prisma.product.findMany({
            where,
            include: withStock,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { id: "asc" },
        }),
        prisma.product.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
};

export const getProductById = async (id) =>
    prisma.product.findFirst({ where: { id, deletedAt: null }, include: withStock });

const assertCategory = async (categoryId) => {
    if (categoryId == null) return;
    const category = await prisma.category.findFirst({
        where: { id: categoryId, deletedAt: null },
    });
    if (!category) throw new AppError(400, "Category not found");
};

export const createProduct = async ({ name, price, categoryId }) => {
    await assertCategory(categoryId);
    return prisma.product.create({
        data: { name, price, categoryId: categoryId ?? null },
        include: withStock,
    });
};

export const updateProduct = async (id, { name, price, categoryId }) => {
    await assertCategory(categoryId);
    return prisma.product.update({
        where: { id, deletedAt: null },
        data: { name, price, categoryId },
        include: withStock,
    });
};

export const deleteProduct = async (id) =>
    prisma.product.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
