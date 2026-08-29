import express from "express";
import categoryRouter from "./routes/categoryRouter.js";
import warehouseRouter from "./routes/warehouseRouter.js"

const app = express();

app.use(express.json());

app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "OK" });
});

app.use("/api/categories", categoryRouter);
app.use("/api/warehouses", warehouseRouter);



export default app;