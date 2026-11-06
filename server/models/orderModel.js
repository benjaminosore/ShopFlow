import pool from "../config/database.js";

// Create a new order with customer delivery details
export const createOrder = async (
  connection,
  userId,
  totalAmount,
  customerPhone,
  shippingAddress,
  deliveryNotes
) => {
  const [result] = await connection.query(
    `INSERT INTO orders (
      user_id,
      customer_phone,
      shipping_address,
      delivery_notes,
      total_amount
    )
    VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      customerPhone,
      shippingAddress,
      deliveryNotes,
      totalAmount
    ]
  );

  return result.insertId;
};

// Add individual products to an order
export const createOrderItem = async (
  connection,
  orderId,
  productId,
  quantity,
  unitPrice
) => {
  await connection.query(
    `INSERT INTO order_items
      (order_id, product_id, quantity, unit_price)
     VALUES (?, ?, ?, ?)`,
    [orderId, productId, quantity, unitPrice]
  );
};

// Retrieve all orders with customer and delivery information
export const getAllOrders = async () => {
  const [rows] = await pool.query(`
    SELECT
      o.id,
      o.user_id,
      u.name AS customer_name,
      u.email AS customer_email,
      o.customer_phone,
      o.shipping_address,
      o.delivery_notes,
      o.status,
      o.total_amount,
      o.created_at,
      o.updated_at
    FROM orders o
    INNER JOIN users u
      ON o.user_id = u.id
    ORDER BY o.id DESC
  `);

  return rows;
};

// Retrieve one order together with its products
export const getOrderById = async (id) => {
  const [orders] = await pool.query(
    `
      SELECT
        o.id,
        o.user_id,
        u.name AS customer_name,
        u.email AS customer_email,
        o.customer_phone,
        o.shipping_address,
        o.delivery_notes,
        o.status,
        o.total_amount,
        o.created_at,
        o.updated_at
      FROM orders o
      INNER JOIN users u
        ON o.user_id = u.id
      WHERE o.id = ?
    `,
    [id]
  );

  if (orders.length === 0) {
    return null;
  }

  const [items] = await pool.query(
    `
      SELECT
        oi.id,
        oi.product_id,
        p.name AS product_name,
        oi.quantity,
        oi.unit_price,
        (oi.quantity * oi.unit_price) AS subtotal
      FROM order_items oi
      INNER JOIN products p
        ON oi.product_id = p.id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `,
    [id]
  );

  return {
    ...orders[0],
    items
  };
};

// Retrieve orders belonging to one customer
export const getOrdersByUserId = async (userId) => {
  const [rows] = await pool.query(
    `
      SELECT
        o.id,
        o.user_id,
        u.name AS customer_name,
        u.email AS customer_email,
        o.customer_phone,
        o.shipping_address,
        o.delivery_notes,
        o.status,
        o.total_amount,
        o.created_at,
        o.updated_at
      FROM orders o
      INNER JOIN users u
        ON o.user_id = u.id
      WHERE o.user_id = ?
      ORDER BY o.id DESC
    `,
    [userId]
  );

  return rows;
};

// Lock an order during a transaction
export const getOrderForUpdate = async (connection, orderId) => {
  const [rows] = await connection.query(
    `
      SELECT
        id,
        user_id,
        status
      FROM orders
      WHERE id = ?
      FOR UPDATE
    `,
    [orderId]
  );

  return rows[0] || null;
};

// Retrieve the products and quantities belonging to an order
export const getOrderItemsForUpdate = async (
  connection,
  orderId
) => {
  const [rows] = await connection.query(
    `
      SELECT
        product_id,
        quantity
      FROM order_items
      WHERE order_id = ?
      ORDER BY product_id ASC
    `,
    [orderId]
  );

  return rows;
};

// Lock a product's inventory record during a transaction
export const getProductForUpdate = async (
  connection,
  productId
) => {
  const [rows] = await connection.query(
    `
      SELECT
        id,
        stock_quantity
      FROM products
      WHERE id = ?
      FOR UPDATE
    `,
    [productId]
  );

  return rows[0] || null;
};

// Restore product stock inside the current transaction
export const restoreProductStock = async (
  connection,
  productId,
  quantity
) => {
  const [result] = await connection.query(
    `
      UPDATE products
      SET stock_quantity = stock_quantity + ?
      WHERE id = ?
    `,
    [quantity, productId]
  );

  return result.affectedRows;
};

// Update an order's status inside the current transaction
export const updateOrderStatusInTransaction = async (
  connection,
  orderId,
  status,
  previousStatus
) => {
  const [result] = await connection.query(
    `
      UPDATE orders
      SET status = ?
      WHERE id = ?
        AND status = ?
    `,
    [status, orderId, previousStatus]
  );

  return result.affectedRows;
};

