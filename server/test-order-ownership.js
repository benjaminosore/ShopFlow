import { stdin as input, stdout as output } from "node:process";
import pool from "./config/database.js";

function askHidden(question) {
  return new Promise((resolve, reject) => {
    if (!input.isTTY || !output.isTTY) {
      reject(
        new Error("Run this test directly in an interactive terminal.")
      );
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

const baseUrl = "http://localhost:5000/api";

try {
  const password = await askHidden(
    "Enter the customer test-account password (hidden): "
  );

  // 1. Authenticate as the test customer.
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "benjamin.auth@shopflow.local",
      password,
    }),
  });

  const loginData = await loginResponse.json();

  if (!loginResponse.ok || !loginData.data?.token) {
    throw new Error("Customer login failed. Check the test credentials.");
  }

  const token = loginData.data.token;
  const customerId = loginData.data.user.id;

  console.log("\nCustomer login successful!");

  // 2. Find an existing order belonging to another customer.
  const [orders] = await pool.execute(
    `SELECT o.id
     FROM orders o
     INNER JOIN users u ON u.id = o.user_id
     WHERE o.user_id <> ?
       AND u.role = 'customer'
     ORDER BY o.id ASC
     LIMIT 1`,
    [customerId]
  );

  if (orders.length === 0) {
    throw new Error(
      "No order belonging to another customer was found."
    );
  }

  const orderId = Number(orders[0].id);

  console.log("Test customer ID:", customerId);
  console.log("Other customer's order ID:", orderId);

  // 3. Attempt to access the other customer's order.
  const orderResponse = await fetch(
    `${baseUrl}/orders/${orderId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  console.log("\n--- Individual Order Ownership Test ---");
  console.log(`Endpoint: GET /api/orders/${orderId}`);
  console.log("HTTP status:", orderResponse.status);

  if (orderResponse.status === 403) {
    console.log(
      "\nPASS: Customer cannot access another customer's order."
    );
  } else {
    throw new Error(
      `Expected HTTP 403, received ${orderResponse.status}.`
    );
  }
} catch (error) {
  console.error("\nTest failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}