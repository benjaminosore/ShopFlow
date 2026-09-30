import pool from "../config/database.js";
import {
  createOrder,
  createOrderItem,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder
} from "../models/orderModel.js";

export const getOrders = async (req, res) => {
  try {
    const orders = await getAllOrders();

    res.json({
      status: "success",
      data: orders
    });
  } catch (error) {
    console.error("Get orders error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve orders"
    });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found"
      });
    }

    res.json({
      status: "success",
      data: order
    });
  } catch (error) {
    console.error("Get order error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve order"
    });
  }
};

export const addOrder = async (req, res) => {
  const { user_id, items } = req.body;

  if (!Number.isInteger(Number(user_id)) || Number(user_id) <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Valid user_id is required"
    });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "Order must contain at least one item"
    });
  }

  const userId = Number(user_id);

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verify customer exists
    const [users] = await connection.query(
      "SELECT id FROM users WHERE id = ?",
      [userId]
    );

    if (users.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        status: "error",
        message: "User not found"
      });
    }

    let totalAmount = 0;
    const orderItems = [];

    // Validate products and stock
    for (const item of items) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(productId) || productId <= 0) {
        await connection.rollback();

        return res.status(400).json({
          status: "error",
          message: "Each item must have a valid product_id"
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        await connection.rollback();

        return res.status(400).json({
          status: "error",
          message: "Each item quantity must be a positive integer"
        });
      }

      const [products] = await connection.query(
        `SELECT id, name, price, stock_quantity
         FROM products
         WHERE id = ?
         FOR UPDATE`,
        [productId]
      );

      if (products.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          status: "error",
          message: `Product ${productId} not found`
        });
      }

      const product = products[0];

      if (product.stock_quantity < quantity) {
        await connection.rollback();

        return res.status(409).json({
          status: "error",
          message: `Insufficient stock for product "${product.name}"`
        });
      }

      const subtotal = Number(product.price) * quantity;

      totalAmount += subtotal;

      orderItems.push({
        productId,
        quantity,
        unitPrice: product.price
      });
    }

    // Create the order
    const orderId = await createOrder(
      connection,
      userId,
      totalAmount
    );

    // Create order items and reduce stock
    for (const item of orderItems) {
      await createOrderItem(
        connection,
        orderId,
        item.productId,
        item.quantity,
        item.unitPrice
      );

      await connection.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - ?
         WHERE id = ?`,
        [item.quantity, item.productId]
      );
    }

    await connection.commit();

    const order = await getOrderById(orderId);

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      data: order
    });
  } catch (error) {
    await connection.rollback();

    console.error("Create order error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to create order"
    });
  } finally {
    connection.release();
  }
};

export const editOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "completed",
      "cancelled"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid order status"
      });
    }

    const affectedRows = await updateOrderStatus(
      req.params.id,
      status
    );

    if (affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Order not found"
      });
    }

    res.json({
      status: "success",
      message: "Order status updated successfully"
    });
  } catch (error) {
    console.error("Update order status error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to update order status"
    });
  }
};

export const removeOrder = async (req, res) => {
  try {
    const affectedRows = await deleteOrder(req.params.id);

    if (affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Order not found"
      });
    }

    res.json({
      status: "success",
      message: "Order deleted successfully"
    });
  } catch (error) {
    console.error("Delete order error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to delete order"
    });
  }
};