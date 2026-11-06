import pool from "../config/database.js";

import {
  createOrder,
  createOrderItem,
  getAllOrders,
  getOrderById,
  getOrdersByUserId,
  getOrderForUpdate,
  getOrderItemsForUpdate,
  getProductForUpdate,
  restoreProductStock,
  updateOrderStatusInTransaction
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

// Get orders belonging to the authenticated customer
export const getMyOrders = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid authenticated user"
      });
    }

    const orders = await getOrdersByUserId(userId);

    res.json({
      status: "success",
      data: orders
    });
  } catch (error) {
    console.error("Get customer orders error:", error.message);

    res.status(500).json({
      status: "error",
      message: "Failed to retrieve your orders"
    });
  }
};

// Get one order
export const getOrder = async (req, res) => {
  try {
    const orderId = Number(req.params.id);

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid order ID"
      });
    }

    const order = await getOrderById(orderId);

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

// Cancel an order and restore its inventory transactionally
export const cancelOrder = async (req, res) => {
  const orderId = Number(req.params.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order ID"
    });
  }

  const userId = Number(req.user.id);
  const role = req.user.role;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({
      status: "error",
      message: "Invalid authenticated user"
    });
  }

  if (role !== "admin" && role !== "customer") {
    return res.status(403).json({
      status: "error",
      message: "You do not have permission to cancel orders"
    });
  }

  let connection;
  let transactionStarted = false;
  let transactionFinished = false;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the order so simultaneous cancellation requests cannot
    // restore the same inventory more than once.
    const order = await getOrderForUpdate(connection, orderId);

    if (!order) {
      await connection.rollback();
      transactionFinished = true;

      return res.status(404).json({
        status: "error",
        message: "Order not found"
      });
    }

    // Customers can only cancel their own orders.
    if (
      role === "customer" &&
      Number(order.user_id) !== userId
    ) {
      await connection.rollback();
      transactionFinished = true;

      return res.status(403).json({
        status: "error",
        message: "You can only cancel your own orders"
      });
    }

    if (order.status === "cancelled") {
      await connection.rollback();
      transactionFinished = true;

      return res.status(409).json({
        status: "error",
        message: "This order has already been cancelled"
      });
    }

    // Customer and admin cancellation permissions differ.
    const allowedStatuses =
      role === "admin"
        ? ["pending", "processing"]
        : ["pending"];

    if (!allowedStatuses.includes(order.status)) {
      await connection.rollback();
      transactionFinished = true;

      return res.status(409).json({
        status: "error",
        message:
          role === "admin"
            ? "Only pending or processing orders can be cancelled"
            : "You can only cancel pending orders"
      });
    }

    // Retrieve all ordered products.
    const orderItems = await getOrderItemsForUpdate(
      connection,
      orderId
    );

    if (orderItems.length === 0) {
      await connection.rollback();
      transactionFinished = true;

      return res.status(409).json({
        status: "error",
        message: "Order has no items to restore"
      });
    }

    // Aggregate duplicate product IDs before restoring inventory.
    const quantitiesByProduct = new Map();

    for (const item of orderItems) {
      const productId = Number(item.product_id);
      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isSafeInteger(quantity) ||
        quantity <= 0
      ) {
        throw new Error(
          `Invalid order item data for order ${orderId}`
        );
      }

      const combinedQuantity =
        (quantitiesByProduct.get(productId) || 0) + quantity;

      if (!Number.isSafeInteger(combinedQuantity)) {
        throw new Error(
          `Combined restoration quantity is too large for product ${productId}`
        );
      }

      quantitiesByProduct.set(productId, combinedQuantity);
    }

    // Lock products in ascending ID order to reduce deadlock risk.
    const sortedProductIds = [...quantitiesByProduct.keys()].sort(
      (a, b) => a - b
    );

    const maximumStock = 4294967295;

    // Validate all inventory before restoring any stock.
    for (const productId of sortedProductIds) {
      const product = await getProductForUpdate(
        connection,
        productId
      );

      if (!product) {
        throw new Error(
          `Product ${productId} no longer exists`
        );
      }

      const currentStock = Number(product.stock_quantity);
      const restoreQuantity = quantitiesByProduct.get(productId);

      if (
        !Number.isSafeInteger(currentStock) ||
        currentStock < 0 ||
        currentStock + restoreQuantity > maximumStock
      ) {
        throw new Error(
          `Inventory restoration would exceed the allowed stock for product ${productId}`
        );
      }
    }

    // Restore inventory inside the same transaction.
    for (const productId of sortedProductIds) {
      const quantity = quantitiesByProduct.get(productId);

      const affectedRows = await restoreProductStock(
        connection,
        productId,
        quantity
      );

      if (affectedRows !== 1) {
        throw new Error(
          `Stock restoration failed for product ${productId}`
        );
      }
    }

    // Mark the order cancelled only after inventory restoration.
    const affectedRows = await updateOrderStatusInTransaction(
      connection,
      orderId,
      "cancelled",
      order.status
    );

    if (affectedRows !== 1) {
      throw new Error(
        `Failed to update cancellation status for order ${orderId}`
      );
    }

    await connection.commit();
    transactionFinished = true;

    res.json({
      status: "success",
      message: "Order cancelled and inventory restored successfully"
    });

  } catch (error) {
    if (connection && transactionStarted && !transactionFinished) {
      try {
        await connection.rollback();
        transactionFinished = true;
      } catch (rollbackError) {
        console.error(
          "Cancellation rollback error:",
          rollbackError.message
        );
      }
    }

    console.error("Cancel order error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        status: "error",
        message: "Failed to cancel order"
      });
    }

  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Update order status using valid forward-only transitions
export const editOrderStatus = async (req, res) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order ID"
    });
  }

  const allowedTransitions = {
    pending: ["processing"],
    processing: ["shipped"],
    shipped: ["completed"],
    completed: [],
    cancelled: []
  };

  if (
    typeof status !== "string" ||
    !Object.prototype.hasOwnProperty.call(
      allowedTransitions,
      status
    ) ||
    status === "cancelled"
  ) {
    return res.status(400).json({
      status: "error",
      message: "Invalid order status transition"
    });
  }

  let connection;
  let transactionStarted = false;
  let transactionFinished = false;

  try {
    connection = await pool.getConnection();

    await connection.beginTransaction();
    transactionStarted = true;

    // Lock the order before checking its current status.
    const order = await getOrderForUpdate(
      connection,
      orderId
    );

    if (!order) {
      await connection.rollback();
      transactionFinished = true;

      return res.status(404).json({
        status: "error",
        message: "Order not found"
      });
    }

    const permittedNextStatuses =
      allowedTransitions[order.status];

    if (!permittedNextStatuses.includes(status)) {
      await connection.rollback();
      transactionFinished = true;

      return res.status(409).json({
        status: "error",
        message: `Cannot change order status from ${order.status} to ${status}`
      });
    }

    const affectedRows = await updateOrderStatusInTransaction(
      connection,
      orderId,
      status,
      order.status
    );

    if (affectedRows !== 1) {
      throw new Error(
        `Order status update failed for order ${orderId}`
      );
    }

    await connection.commit();
    transactionFinished = true;

    res.json({
      status: "success",
      message: "Order status updated successfully"
    });

  } catch (error) {
    if (connection && transactionStarted && !transactionFinished) {
      try {
        await connection.rollback();
        transactionFinished = true;
      } catch (rollbackError) {
        console.error(
          "Status update rollback error:",
          rollbackError.message
        );
      }
    }

    console.error("Update order status error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        status: "error",
        message: "Failed to update order status"
      });
    }

  } finally {
    if (connection) {
      connection.release();
    }
  }
};