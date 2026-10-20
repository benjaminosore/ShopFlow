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

const ordersResponse = await fetch("http://localhost:5000/api/orders", {
  headers: {
    Authorization: `Bearer ${loginData.data.token}`
  }
});

console.log("\n--- Customer Orders Authorization Test ---");
console.log("Endpoint: GET /api/orders");
console.log("HTTP status:", ordersResponse.status);
console.log("Response:", await ordersResponse.text());

if (ordersResponse.status === 403) {
  console.log("\nPASS: Customers cannot view all orders.");
} else {
  console.log("\nCHECK: The result differs from the expected HTTP 403.");
}