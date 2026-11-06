import express from "express";

import {
  getOrders,
  getMyOrders,
  getOrder,
  addOrder,
  cancelOrder,
  editOrderStatus
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

// Authenticated customers: view their own orders
router.get(
  "/mine",
  authenticate,
  getMyOrders
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

// Customers and admins: cancel orders according to their permissions
router.patch(
  "/:id/cancel",
  authenticate,
  cancelOrder
);

// Admin-only: update order status
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  editOrderStatus
);

export default router;