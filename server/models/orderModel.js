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

// Update an order's status
export const updateOrderStatus = async (id, status) => {
  const [result] = await pool.query(
    `UPDATE orders
     SET status = ?
     WHERE id = ?`,
    [status, id]
  );

  return result.affectedRows;
};

// Delete an order
export const deleteOrder = async (id) => {
  const [result] = await pool.query(
    `DELETE FROM orders
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows;
};