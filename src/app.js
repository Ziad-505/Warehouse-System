import express from "express";
import categoryRouter from "./routes/categoryRouter.js";
import warehouseRouter from "./routes/warehouseRouter.js";
import productRouter from "./routes/productRouter.js";
import stockMovementRouter from "./routes/stockMovementRouter.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());
app.use(requestLogger);

app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK" });
});

app.use("/api/categories", categoryRouter);
app.use("/api/warehouses", warehouseRouter);
app.use("/api/products", productRouter);
app.use("/api/stock-movements", stockMovementRouter);

// Order below is not stylistic. Express runs middleware top to bottom, so the
// 404 must sit after every route, and the error handler must be dead last.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
