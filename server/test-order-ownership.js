import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = readline.createInterface({ input, output });

const password = await rl.question("Enter the customer test-account password: ");
rl.close();

const loginResponse = await fetch("http://localhost:5000/api/auth/login", {
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
  console.log("\nCustomer login failed. Check the test account credentials.");
  process.exit(1);
}

console.log("\nCustomer login successful!");

const orderResponse = await fetch("http://localhost:5000/api/orders/1", {
  headers: {
    Authorization: `Bearer ${loginData.data.token}`
  }
});

const responseData = await orderResponse.json();

console.log("\n--- Individual Order Ownership Test ---");
console.log("Endpoint: GET /api/orders/1");
console.log("HTTP status:", orderResponse.status);
console.log("Response:", JSON.stringify(responseData, null, 2));

if (orderResponse.status === 403) {
  console.log("\nPASS: Customer cannot access another user's order.");
} else {
  console.log("\nFAIL: Expected HTTP 403 when accessing another user's order.");
  process.exitCode = 1;
}