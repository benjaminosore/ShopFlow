import {
  getUserById,
  getAllUsers
} from "../models/userModel.js";

export const getCurrentUser = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    res.json({
      status: "success",
      message: "Current user",
      data: {
        user
      }
    });
  } catch (error) {
    console.error("Get current user error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve current user"
    });
  }
};

export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();

    res.json({
      status: "success",
      message: "Users retrieved successfully",
      data: {
        users
      }
    });
  } catch (error) {
    console.error("Get users error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve users"
    });
  }
};

export const getUser = async (req, res) => {
  try {
    const user = await getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    res.json({
      status: "success",
      message: "User retrieved successfully",
      data: {
        user
      }
    });
  } catch (error) {
    console.error("Get user error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve user"
    });
  }
};