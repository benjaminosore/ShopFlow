import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  adjustProductInventory,
  deleteProduct,
} from "../models/productModel.js";

export const getProducts = async (req, res) => {
  try {
    const products = await getAllProducts();

    res.json({
      status: "success",
      data: products,
    });
  } catch (error) {
    console.error("Get products error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve products",
    });
  }
};

export const getProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid product ID is required",
      });
    }

    const product = await getProductById(productId);

    if (!product) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      });
    }

    res.json({
      status: "success",
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve product",
    });
  }
};

export const addProduct = async (req, res) => {
  try {
    const { category_id, name, description, price, stock_quantity, image_url } =
      req.body;

    const categoryId = Number(category_id);
    const productPrice = Number(price);
    const stockQuantity =
      stock_quantity === undefined ? 0 : Number(stock_quantity);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid category_id is required",
      });
    }

    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Product name is required",
      });
    }

    if (!Number.isFinite(productPrice) || productPrice < 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid product price is required",
      });
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      return res.status(400).json({
        status: "error",
        message: "Stock quantity must be a non-negative integer",
      });
    }

    const productDescription =
      typeof description === "string" && description.trim()
        ? description.trim()
        : null;

    const productImage =
      typeof image_url === "string" && image_url.trim()
        ? image_url.trim()
        : null;

    const productId = await createProduct(
      categoryId,
      name.trim(),
      productDescription,
      productPrice,
      stockQuantity,
      productImage,
    );

    res.status(201).json({
      status: "success",
      message: "Product created successfully",
      data: {
        id: productId,
        category_id: categoryId,
        name: name.trim(),
        description: productDescription,
        price: productPrice,
        stock_quantity: stockQuantity,
        image_url: productImage,
      },
    });
  } catch (error) {
    console.error("Create product error:", error.message);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        status: "error",
        message: "Category not found",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to create product",
    });
  }
};

export const editProduct = async (req, res) => {
  try {
    const { category_id, name, description, price, image_url } = req.body;

    const productId = Number(req.params.id);
    const categoryId = Number(category_id);
    const productPrice = Number(price);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid product ID is required",
      });
    }

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid category_id is required",
      });
    }

    if (typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Product name is required",
      });
    }

    if (!Number.isFinite(productPrice) || productPrice < 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid product price is required",
      });
    }

    const productDescription =
      typeof description === "string" && description.trim()
        ? description.trim()
        : null;

    const productImage =
      typeof image_url === "string" && image_url.trim()
        ? image_url.trim()
        : null;

    // Product details are updated without touching inventory.
    const affectedRows = await updateProduct(
      productId,
      categoryId,
      name.trim(),
      productDescription,
      productPrice,
      productImage,
    );

    if (affectedRows === 0) {
      const existingProduct = await getProductById(productId);

      if (!existingProduct) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }
    }

    res.json({
      status: "success",
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Update product error:", error.message);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        status: "error",
        message: "Category not found",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to update product",
    });
  }
};

export const adjustInventory = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { adjustment } = req.body;

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid product ID is required",
      });
    }

    if (
      adjustment === undefined ||
      !Number.isInteger(adjustment) ||
      adjustment === 0
    ) {
      return res.status(400).json({
        status: "error",
        message: "Adjustment must be a non-zero integer",
      });
    }

    const affectedRows = await adjustProductInventory(productId, adjustment);

    if (affectedRows === 0) {
      const product = await getProductById(productId);

      if (!product) {
        return res.status(404).json({
          status: "error",
          message: "Product not found",
        });
      }

      return res.status(409).json({
        status: "error",
        message: "Inventory adjustment would result in negative stock",
      });
    }

    const updatedProduct = await getProductById(productId);

    res.json({
      status: "success",
      message: "Inventory adjusted successfully",
      data: {
        id: updatedProduct.id,
        stock_quantity: updatedProduct.stock_quantity,
      },
    });
  } catch (error) {
    console.error("Adjust inventory error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to adjust inventory",
    });
  }
};

export const removeProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Valid product ID is required",
      });
    }

    const affectedRows = await deleteProduct(productId);

    if (affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Product not found",
      });
    }

    res.json({
      status: "success",
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error.message);

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({
        status: "error",
        message:
          "Product cannot be deleted because it is referenced by an order",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to delete product",
    });
  }
};
