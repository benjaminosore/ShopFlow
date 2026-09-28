import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} from "../models/categoryModel.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await getAllCategories();

    res.json({
      status: "success",
      data: categories
    });
  } catch (error) {
    console.error("Get categories error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve categories"
    });
  }
};

export const getCategory = async (req, res) => {
  try {
    const category = await getCategoryById(req.params.id);

    if (!category) {
      return res.status(404).json({
        status: "error",
        message: "Category not found"
      });
    }

    res.json({
      status: "success",
      data: category
    });
  } catch (error) {
    console.error("Get category error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve category"
    });
  }
};

export const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Category name is required"
      });
    }

    const categoryId = await createCategory(
      name.trim(),
      description?.trim() || null
    );

    res.status(201).json({
      status: "success",
      message: "Category created successfully",
      data: {
        id: categoryId,
        name: name.trim(),
        description: description?.trim() || null
      }
    });
  } catch (error) {
    console.error("Create category error:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "Category already exists"
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to create category"
    });
  }
};
export const editCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Category name is required"
      });
    }

    const affectedRows = await updateCategory(
      req.params.id,
      name.trim(),
      description?.trim() || null
    );

    if (affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Category not found"
      });
    }

    res.json({
      status: "success",
      message: "Category updated successfully"
    });
  } catch (error) {
    console.error("Update category error:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "Category already exists"
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to update category"
    });
  }
};

export const removeCategory = async (req, res) => {
  try {
    const affectedRows = await deleteCategory(req.params.id);

    if (affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Category not found"
      });
    }

    res.json({
      status: "success",
      message: "Category deleted successfully"
    });
  } catch (error) {
    console.error("Delete category error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to delete category"
    });
  }
};