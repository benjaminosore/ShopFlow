import express from "express";

import {
  getProducts,
  getProduct,
  addProduct,
  editProduct,
  adjustInventory,
  removeProduct,
} from "../controllers/productController.js";

import { authenticate, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes: customers can view products.
router.get("/", getProducts);
router.get("/:id", getProduct);

// Admin-only route: create products.
router.post("/", authenticate, authorizeRoles("admin"), addProduct);

// Admin-only route: update product details without changing stock.
router.put("/:id", authenticate, authorizeRoles("admin"), editProduct);

// Admin-only route: adjust inventory separately.
router.patch(
  "/:id/inventory",
  authenticate,
  authorizeRoles("admin"),
  adjustInventory,
);

// Admin-only route: delete products.
router.delete("/:id", authenticate, authorizeRoles("admin"), removeProduct);

export default router;
