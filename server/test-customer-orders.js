import { stdin as input, stdout as output } from "node:process";

function askHidden(question) {
  return new Promise((resolve, reject) => {
    if (!input.isTTY || !output.isTTY) {
      reject(
        new Error("Run this test directly in an interactive terminal."),
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
  // First verify that unauthenticated requests are rejected.
  const unauthorizedResponse = await fetch(
    `${baseUrl}/orders/mine`,
  );

  console.log("\n--- Customer Order History Tests ---");
  console.log("Unauthenticated request:", unauthorizedResponse.status);

  if (unauthorizedResponse.status === 401) {
    console.log("PASS: Unauthenticated users cannot view customer orders.");
  } else {
    console.error(
      `FAIL: Expected HTTP 401, received ${unauthorizedResponse.status}.`,
    );
    process.exitCode = 1;
  }

  // Authenticate the customer test account.
  const password = await askHidden(
    "Enter the customer test-account password (hidden): ",
  );

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
    throw new Error(
      "Customer login failed. Check the test credentials.",
    );
  }

  console.log("\nCustomer login successful!");

  const customerId = Number(loginData.data.user?.id);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    throw new Error("Customer ID was not returned during login.");
  }

  // Retrieve the authenticated customer's orders.
  const ordersResponse = await fetch(`${baseUrl}/orders/mine`, {
    headers: {
      Authorization: `Bearer ${loginData.data.token}`,
    },
  });

  const ordersData = await ordersResponse.json();

  console.log("\nEndpoint: GET /api/orders/mine");
  console.log("HTTP status:", ordersResponse.status);

  if (!ordersResponse.ok) {
    throw new Error(
      `Expected HTTP 200, received ${ordersResponse.status}.`,
    );
  }

  if (!Array.isArray(ordersData.data)) {
    throw new Error("Expected the response data to be an array.");
  }

  console.log("Orders returned:", ordersData.data.length);

  // Verify every returned order belongs to this customer.
  const foreignOrders = ordersData.data.filter(
    (order) => Number(order.user_id) !== customerId,
  );

  if (foreignOrders.length > 0) {
    throw new Error(
      "Security failure: orders belonging to another user were returned.",
    );
  }

  console.log("PASS: Customer can retrieve their order history.");
  console.log("PASS: Every returned order belongs to the authenticated customer.");

  console.log("\nAll customer order-history tests passed!");
} catch (error) {
  console.error("\nTest failed:", error.message);
  process.exitCode = 1;
}