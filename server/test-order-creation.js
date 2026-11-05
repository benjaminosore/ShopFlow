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
  const customerId = Number(loginData.data.user.id);

  console.log("\nCustomer login successful!");

  // 2. Deliberately submit a different user_id to test ownership protection.
  const orderResponse = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: 1,
      items: [
        {
          product_id: 2,
          quantity: 1,
        },
      ],
      customer_phone: "0712345678",
      shipping_address: "ShopFlow authorization test address",
    }),
  });

  const orderData = await orderResponse.json();

  console.log("\n--- Order Creation Authorization Test ---");
  console.log("Authenticated customer ID:", customerId);
  console.log("HTTP status:", orderResponse.status);
  console.log("Response:", JSON.stringify(orderData, null, 2));

  if (
    orderResponse.status === 201 &&
    Number(orderData.data?.user_id) === customerId
  ) {
    console.log(
      "\nPASS: The order belongs to the authenticated customer."
    );
    console.log(
      "PASS: The submitted user_id did not override authenticated ownership."
    );
  } else {
    throw new Error(
      "Order creation or authenticated ownership verification failed."
    );
  }
} catch (error) {
  console.error("\nTest failed:", error.message);
  process.exitCode = 1;
}
