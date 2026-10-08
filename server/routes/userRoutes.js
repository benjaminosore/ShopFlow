import express from "express";

import {
  getCurrentUser,
  getUsers,
  getUser
} from "../controllers/userController.js";

import {
  authenticate,
  authorizeRoles
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Get the currently authenticated user
router.get("/me", authenticate, getCurrentUser);

// Get all users - admin only
router.get(
  "/",
  authenticate,
  authorizeRoles("admin"),
  getUsers
);

// Get a specific user - admin only
router.get(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  getUser
);

export default router;