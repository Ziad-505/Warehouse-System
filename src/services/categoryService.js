import { prisma } from "../lib/prisma.js";

export const getAllCategories = async () => {
    const categories = await prisma.category.findMany({ where: { deletedAt: null }});
    return categories;
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


