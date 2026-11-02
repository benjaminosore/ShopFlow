import { stdin as input, stdout as output } from "node:process";

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

const orderId = process.argv[2];

if (!orderId || !/^\d+$/.test(orderId) || Number(orderId) <= 0) {
  console.error(
    "Usage: node test-order-ownership.js <order-id-owned-by-another-customer>"
  );
  process.exit(1);
}

const baseUrl = "http://localhost:5000/api";

try {
  const password = await askHidden(
    "Enter the customer test-account password (hidden): "
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
    console.error(
      "\nFAIL: Customer login failed. Check the test credentials."
    );
    process.exitCode = 1;
  } else {
    console.log("\nCustomer login successful!");

    const orderResponse = await fetch(
      `${baseUrl}/orders/${Number(orderId)}`,
      {
        headers: {
          Authorization: `Bearer ${loginData.data.token}`,
        },
      }
    );

    console.log("\n--- Individual Order Ownership Test ---");
    console.log(`Endpoint: GET /api/orders/${Number(orderId)}`);
    console.log("HTTP status:", orderResponse.status);

    if (orderResponse.status === 403) {
      console.log(
        "\nPASS: Customer cannot access another customer's order."
      );
    } else if (orderResponse.status === 404) {
      console.error(
        "\nINCONCLUSIVE: Order not found. Choose an existing order owned by another customer."
      );
      process.exitCode = 1;
    } else {
      console.error(
        `\nFAIL: Expected HTTP 403, received ${orderResponse.status}.`
      );
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error("\nTest failed:", error.message);
  process.exitCode = 1;
}
