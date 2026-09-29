import express from "express";
import cors from "cors";

import healthRoutes from "./routes/healthRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import productRoutes from "./routes/productRoutes.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);

export default app;