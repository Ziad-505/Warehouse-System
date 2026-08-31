import { prisma } from "../lib/prisma.js";

export const getAllCategories = async ({ page, limit, search }) => {
    const where = {
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    };
    const [data, total] = await Promise.all([
        prisma.category.findMany({ where, skip: (page - 1) * limit, take: limit }),
        prisma.category.count({ where }),
    ]);
    return { data, meta: { page, limit, total } };
};

export const getCategoryById = async (id) => {
    const category = await prisma.category.findFirst({ where: { id, deletedAt: null }});
    return category;
};

export const createCategory = async ({ name }) => {
    const newCategory = await prisma.category.create({ data: { name }});
    return newCategory;
};

export const updateCategory = async (id, { name }) => {
    const updatedCategory = await prisma.category.update({ where: { id, deletedAt: null }, data: { name }});
    return updatedCategory;
};

export const deleteCategory = async (id) => {
    const deletedCategory = await prisma.category.update({ where: { id, deletedAt: null }, data: { deletedAt: new Date() }});
    return deletedCategory;
};


