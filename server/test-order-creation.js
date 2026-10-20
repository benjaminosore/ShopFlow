import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

const password = await rl.question(
  "Enter the customer test-account password: "
);

rl.close();

// Log in as customer ID 2.
const loginResponse = await fetch(
  "http://localhost:5000/api/auth/login",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "benjamin.auth@shopflow.local",
      password
    })
  }
);

const loginData = await loginResponse.json();

if (!loginResponse.ok || !loginData.data?.token) {
  console.log("Customer login failed. Check the test credentials.");
  process.exitCode = 1;
} else {
  console.log("Customer login successful!");

  // Deliberately submit user_id 1 to test ownership protection.
  const orderResponse = await fetch(
    "http://localhost:5000/api/orders",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${loginData.data.token}`
      },
      body: JSON.stringify({
        user_id: 1,
        items: [
          {
            product_id: 2,
            quantity: 1
          }
        ]
      })
    }
  );

  const orderData = await orderResponse.json();

  console.log("\n--- Order Creation Authorization Test ---");
  console.log("HTTP status:", orderResponse.status);
  console.log("Response:", JSON.stringify(orderData, null, 2));

  if (
    orderResponse.status === 201 &&
    Number(orderData.data?.user_id) === 2
  ) {
    console.log(
      "\nPASS: The order belongs to the authenticated customer (ID 2)."
    );
    console.log(
      "PASS: The submitted user_id did not override authenticated ownership."
    );
  } else if (orderResponse.status === 201) {
    console.log(
      "\nCHECK: The order was created, but ownership needs verification."
    );
  } else {
    console.log(
      "\nCHECK: Order creation did not return the expected HTTP 201."
    );
  }
}
