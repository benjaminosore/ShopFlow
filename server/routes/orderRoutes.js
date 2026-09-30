import express from "express";

import {
  getOrders,
  getOrder,
  addOrder,
  editOrderStatus,
  removeOrder
} from "../controllers/orderController.js";

const router = express.Router();

router.get("/", getOrders);
router.get("/:id", getOrder);
router.post("/", addOrder);
router.put("/:id", editOrderStatus);
router.delete("/:id", removeOrder);

export default router;