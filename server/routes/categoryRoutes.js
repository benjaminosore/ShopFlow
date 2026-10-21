import express from "express";

import {
  getCategories,
  getCategory,
  addCategory,
  editCategory,
  removeCategory
} from "../controllers/categoryController.js";

import {
  authenticate,
  authorizeRoles
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public category browsing
router.get("/", getCategories);

router.get("/:id", getCategory);

// Admin-only category management
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  addCategory
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  editCategory
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  removeCategory
);

export default router;
