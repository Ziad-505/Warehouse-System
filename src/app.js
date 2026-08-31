import express from "express";
import categoryRouter from "./routes/categoryRouter.js";
import warehouseRouter from "./routes/warehouseRouter.js";
import productRouter from "./routes/productRouter.js";
import stockMovementRouter from "./routes/stockMovementRouter.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

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

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
