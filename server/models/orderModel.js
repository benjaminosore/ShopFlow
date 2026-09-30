import pool from "../config/database.js";

export const createOrder = async (connection, userId, totalAmount) => {
  const [result] = await connection.query(
    `INSERT INTO orders (user_id, total_amount)
     VALUES (?, ?)`,
    [userId, totalAmount]
  );

  return result.insertId;
};

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

export const getAllOrders = async () => {
  const [rows] = await pool.query(`
    SELECT
      o.id,
      o.user_id,
      u.name AS customer_name,
      u.email AS customer_email,
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

export const getOrderById = async (id) => {
  const [orders] = await pool.query(`
    SELECT
      o.id,
      o.user_id,
      u.name AS customer_name,
      u.email AS customer_email,
      o.status,
      o.total_amount,
      o.created_at,
      o.updated_at
    FROM orders o
    INNER JOIN users u
      ON o.user_id = u.id
    WHERE o.id = ?
  `, [id]);

  if (orders.length === 0) {
    return null;
  }

  const [items] = await pool.query(`
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
  `, [id]);

  return {
    ...orders[0],
    items
  };
};

export const updateOrderStatus = async (id, status) => {
  const [result] = await pool.query(
    `UPDATE orders
     SET status = ?
     WHERE id = ?`,
    [status, id]
  );

  return result.affectedRows;
};

export const deleteOrder = async (id) => {
  const [result] = await pool.query(
    `DELETE FROM orders
     WHERE id = ?`,
    [id]
  );

  return result.affectedRows;
};