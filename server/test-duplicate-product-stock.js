import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

const password = await rl.question(
  "Enter the customer test-account password: "
);

rl.close();

const BASE_URL = "http://localhost:5000/api";

async function main() {
  // 1. Authenticate as the test customer.
  const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "benjamin.auth@shopflow.local",
      password
    })
  });

  const loginData = await loginResponse.json();

  if (!loginResponse.ok || !loginData.data?.token) {
    throw new Error("Customer login failed. Check the test credentials.");
  }

  const token = loginData.data.token;

  console.log("Customer login successful!");

  // 2. Retrieve the product's current stock.
  const productId = 2;

  const beforeResponse = await fetch(
    `${BASE_URL}/products/${productId}`
  );

  const beforeData = await beforeResponse.json();

  if (!beforeResponse.ok || !beforeData.data) {
    throw new Error("Could not retrieve the test product.");
  }

  const stockBefore = Number(beforeData.data.stock_quantity);

  if (!Number.isSafeInteger(stockBefore) || stockBefore <= 0) {
    throw new Error("The test product must have positive stock.");
  }

  console.log("\n--- Duplicate Product Stock Test ---");
  console.log("Product:", beforeData.data.name);
  console.log("Product ID:", productId);
  console.log("Stock before:", stockBefore);

  // 3. Request the available stock twice.
  // The combined quantity must exceed available inventory.
  const orderResponse = await fetch(`${BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
  customer_phone: "0712345678",
  shipping_address: "Konza Technopolis, Machakos",
  delivery_notes: "Duplicate stock validation test",
  items: [
    {
      product_id: productId,
      quantity: stockBefore
    },
    {
      product_id: productId,
      quantity: stockBefore
    }
  ]
})
  });

  const orderData = await orderResponse.json();

  console.log("\nOrder HTTP status:", orderResponse.status);
  console.log("Order response:", JSON.stringify(orderData, null, 2));

  // 4. Retrieve inventory again.
  const afterResponse = await fetch(
    `${BASE_URL}/products/${productId}`
  );

  const afterData = await afterResponse.json();

  if (!afterResponse.ok || !afterData.data) {
    throw new Error("Could not verify the product's stock afterward.");
  }

  const stockAfter = Number(afterData.data.stock_quantity);

  console.log("\nStock before:", stockBefore);
  console.log("Stock after:", stockAfter);

  // 5. Verify rejection and unchanged stock.
  if (orderResponse.status === 409 && stockAfter === stockBefore) {
    console.log("\nPASS: Excess duplicate quantities were rejected.");
    console.log("PASS: Product inventory remained unchanged.");
  } else {
    console.error("\nFAIL: The expected result was not observed.");
    console.error("Expected HTTP 409 and unchanged stock.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("\nTest error:", error.message);
  process.exitCode = 1;
});