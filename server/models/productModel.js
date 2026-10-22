import pool from "../config/database.js";
export const getAllProducts = async () => {
  const [rows] = await pool.query(`     SELECT
      p.id,
      p.category_id,
      c.name AS category_name,
      p.name,
      p.description,
      p.price,
      p.stock_quantity,
      p.image_url,
      p.created_at,
      p.updated_at
    FROM products p
    INNER JOIN categories c
      ON p.category_id = c.id
    ORDER BY p.id DESC
  `);

  return rows;
};

export const getProductById = async (id) => {
  const [rows] = await pool.query(
    `     SELECT
      p.id,
      p.category_id,
      c.name AS category_name,
      p.name,
      p.description,
      p.price,
      p.stock_quantity,
      p.image_url,
      p.created_at,
      p.updated_at
    FROM products p
    INNER JOIN categories c
      ON p.category_id = c.id
    WHERE p.id = ?
    `,
    [id],
  );

  return rows[0];
};

export const createProduct = async (
  categoryId,
  name,
  description,
  price,
  stockQuantity,
  imageUrl,
) => {
  const [result] = await pool.query(
    `INSERT INTO products
      (category_id, name, description, price, stock_quantity, image_url)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [categoryId, name, description, price, stockQuantity, imageUrl],
  );

  return result.insertId;
};

export const updateProduct = async (
  id,
  categoryId,
  name,
  description,
  price,
  imageUrl,
) => {
  const [result] = await pool.query(
    `UPDATE products
     SET
       category_id = ?,
       name = ?,
       description = ?,
       price = ?,
       image_url = ?
     WHERE id = ?`,
    [categoryId, name, description, price, imageUrl, id],
  );

  return result.affectedRows;
};

export const adjustProductInventory = async (id, adjustment) => {
  const [result] = await pool.query(
    `UPDATE products
     SET stock_quantity = stock_quantity + ?
     WHERE id = ?
       AND (
         ? > 0
         OR stock_quantity >= ABS(?)
       )`,
    [adjustment, id, adjustment, adjustment],
  );

  return result.affectedRows;
};

export const deleteProduct = async (id) => {
  const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);

  return result.affectedRows;
};
