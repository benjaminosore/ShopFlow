import { stdin as input, stdout as output } from "node:process";
import pool from "./config/database.js";

const baseUrl = "http://localhost:5000/api";
const productId = 2;
const testMarker = "ShopFlow cancellation integration test";

function askHidden(question) {
  return new Promise((resolve, reject) => {
    if (!input.isTTY || !output.isTTY) {
      reject(new Error("Run this test directly in an interactive terminal."));
      return;
    }

    output.write(question);
    input.setRawMode(true);
    input.resume();

    let password = "";

    const cleanup = () => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
    };

    const onData = (key) => {
      const character = key.toString();

      if (character === "\u0003") {
        cleanup();
        output.write("\n");
        reject(new Error("Password prompt cancelled."));
        return;
      }

      if (character === "\r" || character === "\n") {
        cleanup();
        output.write("\n");
        resolve(password);
        return;
      }

      if (character === "\u007f" || character === "\b") {
        password = password.slice(0, -1);
        return;
      }

      if (!character.startsWith("\u001b")) {
        password += character;
      }
    };

    input.on("data", onData);
  });
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function login(email, password, label) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await readJson(response);

  if (!response.ok || !data.data?.token) {
    throw new Error(`${label} login failed. Check the test credentials.`);
  }

  console.log(`PASS: ${label} login successful.`);

  return {
    token: data.data.token,
    userId: Number(data.data.user.id),
  };
}

async function apiRequest(path, { token, method = "GET", body } = {}) {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  return {
    status: response.status,
    data: await readJson(response),
  };
}

function assertStatus(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(
      `${label}: expected HTTP ${expected}, received HTTP ${actual}.`
    );
  }

  console.log(`PASS: ${label} (HTTP ${actual}).`);
}

function assertEqual(label, actual, expected) {
  if (Number(actual) !== Number(expected)) {
    throw new Error(
      `${label}: expected ${expected}, received ${actual}.`
    );
  }

  console.log(`PASS: ${label} (${actual}).`);
}

async function getStock() {
  const [rows] = await pool.execute(
    "SELECT stock_quantity FROM products WHERE id = ?",
    [productId]
  );

  if (rows.length === 0) {
    throw new Error(`Test product ${productId} was not found.`);
  }

  return Number(rows[0].stock_quantity);
}

// Creates a real test order and optionally reserves its stock.
async function createFixture(userId, status, reserveStock = true) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    if (reserveStock) {
      const [products] = await connection.execute(
        "SELECT stock_quantity FROM products WHERE id = ? FOR UPDATE",
        [productId]
      );

      if (
        products.length === 0 ||
        Number(products[0].stock_quantity) < 1
      ) {
        throw new Error("Insufficient stock for cancellation test fixtures.");
      }

      await connection.execute(
        `UPDATE products
         SET stock_quantity = stock_quantity - 1
         WHERE id = ?`,
        [productId]
      );
    }

    const [orderResult] = await connection.execute(
      `INSERT INTO orders (
        user_id,
        customer_phone,
        shipping_address,
        delivery_notes,
        status,
        total_amount
      )
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        "0700000000",
        "ShopFlow automated test address",
        `${testMarker} - ${status}`,
        status,
        "100.00",
      ]
    );

    const orderId = Number(orderResult.insertId);

    await connection.execute(
      `INSERT INTO order_items (
        order_id,
        product_id,
        quantity,
        unit_price
      )
      VALUES (?, ?, ?, ?)`,
      [orderId, productId, 1, "100.00"]
    );

    await connection.commit();

    return orderId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function main() {
  let originalStock = null;
  let customer = null;
  let admin = null;

  try {
    const customerPassword = await askHidden(
      "Enter the customer test-account password (hidden): "
    );

    const adminPassword = await askHidden(
      "Enter the administrator test-account password (hidden): "
    );

    customer = await login(
      "benjamin.auth@shopflow.local",
      customerPassword,
      "Customer"
    );

    admin = await login(
      "admin@shopflow.local",
      adminPassword,
      "Administrator"
    );

    // Confirm a second customer exists for ownership testing.
    const [otherCustomers] = await pool.execute(
      `SELECT id
       FROM users
       WHERE id <> ?
         AND role = 'customer'
       ORDER BY id ASC
       LIMIT 1`,
      [customer.userId]
    );

    if (otherCustomers.length === 0) {
      throw new Error("No second customer account was found.");
    }

    const otherCustomerId = Number(otherCustomers[0].id);

    originalStock = await getStock();

    console.log("\n--- Cancellation Test Setup ---");
    console.log("Customer ID:", customer.userId);
    console.log("Other customer ID:", otherCustomerId);
    console.log("Administrator ID:", admin.userId);
    console.log("Product ID:", productId);
    console.log("Original stock:", originalStock);

    // Seven reserved units are needed for the test fixtures.
    if (originalStock < 7) {
      throw new Error(
        `At least 7 units are required. Current stock: ${originalStock}.`
      );
    }

    // Create test orders. These are retained as order history.
    const ownPendingOrder = await createFixture(
      customer.userId,
      "pending"
    );

    const ownProcessingOrder = await createFixture(
      customer.userId,
      "processing"
    );

    const foreignPendingOrder = await createFixture(
      otherCustomerId,
      "pending"
    );

    const adminProcessingOrder = await createFixture(
      otherCustomerId,
      "processing"
    );

    const adminShippedOrder = await createFixture(
      otherCustomerId,
      "shipped"
    );

    const adminCompletedOrder = await createFixture(
      otherCustomerId,
      "completed"
    );

    const concurrentOrder = await createFixture(
      customer.userId,
      "pending"
    );

    const alreadyCancelledOrder = await createFixture(
      customer.userId,
      "cancelled",
      false
    );

    console.log("\nTest orders created successfully.");

    // 1. Unauthenticated cancellation must be rejected.
    const unauthenticated = await apiRequest(
      `/orders/${ownPendingOrder}/cancel`,
      { method: "PATCH" }
    );

    assertStatus(
      "Unauthenticated cancellation is rejected",
      unauthenticated.status,
      401
    );

    // 2. Customer can cancel their own pending order.
    let stockBefore = await getStock();

    const customerCancellation = await apiRequest(
      `/orders/${ownPendingOrder}/cancel`,
      {
        token: customer.token,
        method: "PATCH",
      }
    );

    assertStatus(
      "Customer cancels their own pending order",
      customerCancellation.status,
      200
    );

    let stockAfter = await getStock();

    assertEqual(
      "Customer cancellation restores one stock unit",
      stockAfter,
      stockBefore + 1
    );

    // 3. Repeated cancellation must not restore stock again.
    stockBefore = await getStock();

    const repeatedCancellation = await apiRequest(
      `/orders/${ownPendingOrder}/cancel`,
      {
        token: customer.token,
        method: "PATCH",
      }
    );

    assertStatus(
      "Repeated cancellation is rejected",
      repeatedCancellation.status,
      409
    );

    stockAfter = await getStock();

    assertEqual(
      "Repeated cancellation does not restore stock twice",
      stockAfter,
      stockBefore
    );

    // 4. Customer cannot cancel another customer's order.
    const foreignCancellation = await apiRequest(
      `/orders/${foreignPendingOrder}/cancel`,
      {
        token: customer.token,
        method: "PATCH",
      }
    );

    assertStatus(
      "Customer cannot cancel another customer's order",
      foreignCancellation.status,
      403
    );

    // 5. Customer cannot cancel a processing order.
    const customerProcessingCancellation = await apiRequest(
      `/orders/${ownProcessingOrder}/cancel`,
      {
        token: customer.token,
        method: "PATCH",
      }
    );

    assertStatus(
      "Customer cannot cancel a processing order",
      customerProcessingCancellation.status,
      409
    );

    // 6. Administrator can cancel a processing order.
    stockBefore = await getStock();

    const adminCancellation = await apiRequest(
      `/orders/${adminProcessingOrder}/cancel`,
      {
        token: admin.token,
        method: "PATCH",
      }
    );

    assertStatus(
      "Administrator cancels a processing order",
      adminCancellation.status,
      200
    );

    stockAfter = await getStock();

    assertEqual(
      "Administrator cancellation restores one stock unit",
      stockAfter,
      stockBefore + 1
    );

    // 7. Shipped orders cannot be cancelled.
    const shippedCancellation = await apiRequest(
      `/orders/${adminShippedOrder}/cancel`,
      {
        token: admin.token,
        method: "PATCH",
      }
    );

    assertStatus(
      "Shipped order cancellation is rejected",
      shippedCancellation.status,
      409
    );

    // 8. Completed orders cannot be cancelled.
    const completedCancellation = await apiRequest(
      `/orders/${adminCompletedOrder}/cancel`,
      {
        token: admin.token,
        method: "PATCH",
      }
    );

    assertStatus(
      "Completed order cancellation is rejected",
      completedCancellation.status,
      409
    );

    // 9. Already-cancelled orders cannot be cancelled again.
    const alreadyCancelled = await apiRequest(
      `/orders/${alreadyCancelledOrder}/cancel`,
      {
        token: customer.token,
        method: "PATCH",
      }
    );

    assertStatus(
      "Already-cancelled order cannot be cancelled again",
      alreadyCancelled.status,
      409
    );

    // 10. Concurrent cancellation must restore stock exactly once.
    stockBefore = await getStock();

    const concurrentResults = await Promise.all([
      apiRequest(`/orders/${concurrentOrder}/cancel`, {
        token: customer.token,
        method: "PATCH",
      }),
      apiRequest(`/orders/${concurrentOrder}/cancel`, {
        token: customer.token,
        method: "PATCH",
      }),
    ]);

    const concurrentStatuses = concurrentResults
      .map((result) => result.status)
      .sort((a, b) => a - b);

    assertEqual(
      "Concurrent cancellation first response",
      concurrentStatuses[0],
      200
    );

    assertEqual(
      "Concurrent cancellation second response",
      concurrentStatuses[1],
      409
    );

    stockAfter = await getStock();

    assertEqual(
      "Concurrent cancellation restores stock exactly once",
      stockAfter,
      stockBefore + 1
    );

    // 11. Admin cannot bypass cancellation rules through status updates.
    const directCancellation = await apiRequest(
      `/orders/${ownPendingOrder}`,
      {
        token: admin.token,
        method: "PUT",
        body: { status: "cancelled" },
      }
    );

    assertStatus(
      "Direct status update cannot bypass cancellation workflow",
      directCancellation.status,
      400
    );

    // 12. Permanent order deletion is not exposed.
    const deletionAttempt = await apiRequest(
      `/orders/${ownPendingOrder}`,
      {
        token: admin.token,
        method: "DELETE",
      }
    );

    assertStatus(
      "Permanent order deletion endpoint is unavailable",
      deletionAttempt.status,
      404
    );

    console.log("\nALL ORDER CANCELLATION TESTS PASSED.");
  } finally {
    // Restore the exact original inventory level for this test product.
    // Test orders remain in the database as historical records.
    if (originalStock !== null) {
      try {
        const [result] = await pool.execute(
          `UPDATE products
           SET stock_quantity = ?
           WHERE id = ?`,
          [originalStock, productId]
        );

        if (result.affectedRows === 1) {
          console.log(
            `\nInventory cleanup: product ${productId} restored to ${originalStock}.`
          );
        }
      } catch (cleanupError) {
        console.error(
          "\nInventory cleanup failed:",
          cleanupError.message
        );
      }
    }

    await pool.end();
  }
}

try {
  await main();
} catch (error) {
  console.error("\nCANCELLATION TEST FAILED:", error.message);
  process.exitCode = 1;
}
