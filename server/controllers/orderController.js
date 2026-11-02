import pool from "../config/database.js";

import {
  createOrder,
  createOrderItem,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder
} from "../models/orderModel.js";

// Get all orders (admin access is enforced by the route)
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

// Get one order
export const getOrder = async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);

    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found"
      });
    }

    // Customers can only view their own orders.
    // Admins can view any order.
    if (
      req.user.role !== "admin" &&
      Number(order.user_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({
        status: "error",
        message: "You do not have permission to access this order"
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

// Create a new order
export const addOrder = async (req, res) => {
  const {
    items,
    customer_phone,
    shipping_address,
    delivery_notes
  } = req.body;

  // The authenticated user's ID determines order ownership.
  const userId = Number(req.user.id);

  // Validate authenticated user.
  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      status: "error",
      message: "Invalid authenticated user"
    });
  }

  // Validate customer phone number.
  if (
    typeof customer_phone !== "string" ||
    !customer_phone.trim() ||
    customer_phone.trim().length > 20
  ) {
    return res.status(400).json({
      status: "error",
      message: "A valid customer phone number is required (maximum 20 characters)"
    });
  }

  // Validate shipping address.
  if (
    typeof shipping_address !== "string" ||
    !shipping_address.trim() ||
    shipping_address.trim().length > 2000
  ) {
    return res.status(400).json({
      status: "error",
      message: "A valid shipping address is required"
    });
  }

  // Validate optional delivery notes.
  if (
    delivery_notes !== undefined &&
    delivery_notes !== null &&
    typeof delivery_notes !== "string"
  ) {
    return res.status(400).json({
      status: "error",
      message: "Delivery notes must be text"
    });
  }

  const customerPhone = customer_phone.trim();
  const shippingAddress = shipping_address.trim();

  const deliveryNotes =
    typeof delivery_notes === "string" && delivery_notes.trim()
      ? delivery_notes.trim()
      : null;

  // Validate order items.
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: "error",
      message: "Order must contain at least one item"
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();

    // Verify the authenticated user exists.
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
    const quantitiesByProduct = new Map();

    // Step 1: Validate items and combine duplicate product IDs.
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

      const combinedQuantity =
        (quantitiesByProduct.get(productId) || 0) + quantity;

      if (!Number.isSafeInteger(combinedQuantity)) {
        await connection.rollback();

        return res.status(400).json({
          status: "error",
          message: "Combined product quantity is too large"
        });
      }

      quantitiesByProduct.set(productId, combinedQuantity);
    }

    // Step 2: Lock products in a consistent order and validate available stock.
    const sortedProductIds = [...quantitiesByProduct.keys()].sort(
      (a, b) => a - b
    );

    for (const productId of sortedProductIds) {
      const quantity = quantitiesByProduct.get(productId);

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

      if (Number(product.stock_quantity) < quantity) {
        await connection.rollback();

        return res.status(409).json({
          status: "error",
          message: `Insufficient stock for product "${product.name}"`
        });
      }

      const subtotal = Number(product.price) * quantity;

      if (!Number.isFinite(subtotal)) {
        throw new Error(`Invalid price for product ${productId}`);
      }

      totalAmount += subtotal;

      orderItems.push({
        productId,
        quantity,
        unitPrice: product.price
      });
    }

    // Step 3: Create the order with customer delivery information.
    const orderId = await createOrder(
      connection,
      userId,
      totalAmount,
      customerPhone,
      shippingAddress,
      deliveryNotes
    );

    // Step 4: Save order items and reduce stock.
    for (const item of orderItems) {
      await createOrderItem(
        connection,
        orderId,
        item.productId,
        item.quantity,
        item.unitPrice
      );

      const [stockUpdate] = await connection.query(
        `UPDATE products
         SET stock_quantity = stock_quantity - ?
         WHERE id = ?
           AND stock_quantity >= ?`,
        [item.quantity, item.productId, item.quantity]
      );

      if (stockUpdate.affectedRows !== 1) {
        throw new Error(
          `Stock update failed for product ${item.productId}`
        );
      }
    }

    // Step 5: Commit the transaction.
    await connection.commit();

    // Retrieve the completed order, including delivery details.
    const order = await getOrderById(orderId);

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      data: order
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Order rollback error:", rollbackError.message);
      }
    }

    console.error("Create order error:", error);

    res.status(500).json({
      status: "error",
      message: "Failed to create order"
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Update order status (admin access is enforced by the route)
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

// Delete an order (admin access is enforced by the route)
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