import express from "express";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", authenticate, (req, res) => {
  res.json({
    status: "success",
    message: "Authenticated user",
    data: {
      user: req.user
    }
  });
});

export default router;