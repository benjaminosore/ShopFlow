import pool from "../config/database.js";

export const getAllCategories = async () => {
  const [rows] = await pool.query(
    "SELECT id, name, description, created_at, updated_at FROM categories ORDER BY id DESC"
  );

  return rows;
};

export const getCategoryById = async (id) => {
  const [rows] = await pool.query(
    "SELECT id, name, description, created_at, updated_at FROM categories WHERE id = ?",
    [id]
  );

  return rows[0];
};

export const createCategory = async (name, description) => {
  const [result] = await pool.query(
    "INSERT INTO categories (name, description) VALUES (?, ?)",
    [name, description]
  );

  return result.insertId;
};

export const updateCategory = async (id, name, description) => {
  const [result] = await pool.query(
    "UPDATE categories SET name = ?, description = ? WHERE id = ?",
    [name, description, id]
  );

  return result.affectedRows;
};

export const deleteCategory = async (id) => {
  const [result] = await pool.query(
    "DELETE FROM categories WHERE id = ?",
    [id]
  );

  return result.affectedRows;
};