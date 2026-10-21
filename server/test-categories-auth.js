import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

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
      if (key.toString() === "\u0003") {
        cleanup();
        output.write("\n");
        reject(new Error("Password prompt cancelled."));
        return;
      }

      if (key.toString() === "\r" || key.toString() === "\n") {
        cleanup();
        output.write("\n");
        resolve(password);
        return;
      }

      if (key.toString() === "\u007f" || key.toString() === "\b") {
        password = password.slice(0, -1);
        return;
      }

      if (!key.toString().startsWith("\u001b")) {
        password += key.toString();
      }
    };

    input.on("data", onData);
  });
}

let password;

try {
  password = await askHidden("Enter the customer test-account password (hidden): ");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const baseUrl = "http://localhost:5000/api";

const tokenResponse = await fetch(`${baseUrl}/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "benjamin.auth@shopflow.local",
    password
  })
});

const loginData = await tokenResponse.json();

if (!tokenResponse.ok || !loginData.data?.token) {
  console.error("Customer login failed. Check the credentials and try again.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${loginData.data.token}`
};

const tests = [
  {
    label: "Customer cannot create categories",
    method: "POST",
    url: `${baseUrl}/categories`,
    body: {
      name: "Customer Security Test",
      description: "Must not be created"
    }
  },
  {
    label: "Customer cannot update categories",
    method: "PUT",
    url: `${baseUrl}/categories/999999`,
    body: {
      name: "Unauthorized Update",
      description: "Must not be updated"
    }
  },
  {
    label: "Customer cannot delete categories",
    method: "DELETE",
    url: `${baseUrl}/categories/999999`
  }
];

let failures = 0;

for (const test of tests) {
  const response = await fetch(test.url, {
    method: test.method,
    headers,
    ...(test.body ? { body: JSON.stringify(test.body) } : {})
  });

  const responseBody = await response.text();
  const passed = response.status === 403;

  console.log(`\n${test.label}`);
  console.log("HTTP status:", response.status);
  console.log("Response:", responseBody);
  console.log(passed ? "PASS" : "FAIL: Expected HTTP 403");

  if (!passed) failures++;
}

if (failures) {
  console.error(`\n${failures} customer authorization test(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll customer category authorization tests passed.");
}