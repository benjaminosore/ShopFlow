import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
} from "../models/productModel.js";

export const getProducts = async (req, res) => {
  try {
    const products = await getAllProducts();

    res.json({
      status: "success",
      data: products
    });
  } catch (error) {
    console.error("Get products error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve products"
    });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found"
      });
    }

    res.json({
      status: "success",
      data: product
    });
  } catch (error) {
    console.error("Get product error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve product"
    });
  }
};

export const addProduct = async (req, res) => {
  try {
    const {
      category_id,
      name,
      description,
      price,
      stock_quantity,
      image_url
    } = req.body;

    const categoryId = Number(category_id);
    const productPrice = Number(price);
    const stockQuantity =
      stock_quantity === undefined ? 0 : Number(stock_quantity);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid category_id is required"
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Product name is required"
      });
    }

    if (!Number.isFinite(productPrice) || productPrice < 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid product price is required"
      });
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({
        status: "error",
        message: "Stock quantity must be a non-negative integer"
      });
    }

    const productId = await createProduct(
      categoryId,
      name.trim(),
      description?.trim() || null,
      productPrice,
      stockQuantity,
      image_url?.trim() || null
    );

    res.status(201).json({
      status: "success",
      message: "Product created successfully",
      data: {
        id: productId,
        category_id: categoryId,
        name: name.trim(),
        description: description?.trim() || null,
        price: productPrice,
        stock_quantity: stockQuantity,
        image_url: image_url?.trim() || null
      }
    });
  } catch (error) {
    console.error("Create product error:", error.message);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        status: "error",
        message: "Category not found"
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to create product"
    });
  }
};

export const editProduct = async (req, res) => {
  try {
    const {
      category_id,
      name,
      description,
      price,
      stock_quantity,
      image_url
    } = req.body;

    const categoryId = Number(category_id);
    const productPrice = Number(price);
    const stockQuantity =
      stock_quantity === undefined ? 0 : Number(stock_quantity);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid category_id is required"
      });
    }

    if (!name || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Product name is required"
      });
    }

    if (!Number.isFinite(productPrice) || productPrice < 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid product price is required"
      });
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({
        status: "error",
        message: "Stock quantity must be a non-negative integer"
      });
    }

    const affectedRows = await updateProduct(
      req.params.id,
      categoryId,
      name.trim(),
      description?.trim() || null,
      productPrice,
      stockQuantity,
      image_url?.trim() || null
    );

    if (affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Product not found"
      });
    }

    res.json({
      status: "success",
      message: "Product updated successfully"
    });
  } catch (error) {
    console.error("Update product error:", error.message);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        status: "error",
        message: "Category not found"
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to update product"
    });
  }
};

export const removeProduct = async (req, res) => {
  try {
    const affectedRows = await deleteProduct(req.params.id);

    if (affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Product not found"
      });
    }

    res.json({
      status: "success",
      message: "Product deleted successfully"
    });
  } catch (error) {
    console.error("Delete product error:", error.message);

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        status: "error",
        message: "Product cannot be deleted because it is referenced by an order"
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to delete product"
    });
  }
};