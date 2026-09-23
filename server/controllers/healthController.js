import pool from "../config/database.js";

export const getHealth = async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT DATABASE() AS database_name"
    );

    res.json({
      status: "success",
      message: "ShopFlow API is running",
      database: "connected",
      database_name: rows[0].database_name
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(500).json({
      status: "error",
      message: "ShopFlow API is running, but database connection failed"
    });
  }
};