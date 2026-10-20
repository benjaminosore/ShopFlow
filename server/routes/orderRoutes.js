import express from "express";

import {
  getOrders,
  getOrder,
  addOrder,
  editOrderStatus,
  removeOrder
} from "../controllers/orderController.js";

import {
  authenticate,
  authorizeRoles
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Admin-only: view all orders
router.get(
  "/",
  authenticate,
  authorizeRoles("admin"),
  getOrders
);

// Authenticated users: ownership check handled by controller
router.get(
  "/:id",
  authenticate,
  getOrder
);

// Authenticated users can create orders
router.post(
  "/",
  authenticate,
  addOrder
);

// Admin-only: update order status
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  editOrderStatus
);

// Admin-only: delete orders
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  removeOrder
);

export default router;