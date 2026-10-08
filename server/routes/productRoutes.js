import express from "express";

import {
  getProducts,
  getProduct,
  addProduct,
  editProduct,
  removeProduct
} from "../controllers/productController.js";

import {
  authenticate,
  authorizeRoles
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public product browsing
router.get("/", getProducts);

router.get("/:id", getProduct);

// Admin-only product management
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  addProduct
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  editProduct
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  removeProduct
);

export default router;