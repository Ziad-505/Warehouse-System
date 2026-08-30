import { prisma } from "../lib/prisma.js";

export const getAllProducts = async () => {
    const products = await prisma.product.findMany({ where: { deletedAt: null }, include: { category: true, warehouse: true }, });
    return products;
};

export const getProductById = async (id) => {
    const product = await prisma.product.findFirst({ where: { id: Number(id), deletedAt: null }, include: { category: true, warehouse: true }, });
    return product;
};

export const createProduct = async ({ name, price, quantity, categoryId, warehouseId }) => {
    if(categoryId != null){
        const category = await prisma.category.findFirst({
            where: { id: Number(categoryId), deletedAt: null },
        });
        if (!category) throw new Error("Category not found");
    }
    if(warehouseId != null){
        const warehouse = await prisma.warehouse.findFirst({
            where: { id: Number(warehouseId), deletedAt: null },
        });
        if (!warehouse) throw new Error("Warehouse not found");
    }

    const newProduct = await prisma.product.create({ data: { name, price, quantity: quantity ?? 0, categoryId: categoryId != null ? Number(categoryId) : null, warehouseId: warehouseId != null ? Number(warehouseId) : null,  }});
    return newProduct;
};

export const updateProduct = async (id, { name, price, categoryId, warehouseId }) => {
    if(categoryId != null){
        const category = await prisma.category.findFirst({
            where: { id: Number(categoryId), deletedAt: null },
        });
        if (!category) throw new Error("Category not found");
    }
    if(warehouseId != null){
        const warehouse = await prisma.warehouse.findFirst({
            where: { id: Number(warehouseId), deletedAt: null },
        });
        if (!warehouse) throw new Error("Warehouse not found");
    }
    const updatedProduct = await prisma.product.update({ where: { id: Number(id), deletedAt: null,  }, data: { name, price, categoryId: categoryId != null ? Number(categoryId) : categoryId, warehouseId: warehouseId != null ? Number(warehouseId) : warehouseId }});
    return updatedProduct;
};

export const deleteProduct = async (id) => {
    const deletedProduct = await prisma.product.update({ where: { id: Number(id), deletedAt: null }, data: { deletedAt: new Date() }});
    return deletedProduct;
};


