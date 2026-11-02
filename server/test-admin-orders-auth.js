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
  const password = await askHidden(
    "Enter the administrator test-account password (hidden): ",
  );

  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "admin@shopflow.local",
      password,
    }),
  });

  const loginData = await loginResponse.json();

  if (!loginResponse.ok || !loginData.data?.token) {
    console.error(
      "\nFAIL: Administrator login failed. Check the test credentials.",
    );
    process.exitCode = 1;
  } else {
    console.log("\nAdministrator login successful!");

    const ordersResponse = await fetch(`${baseUrl}/orders`, {
      headers: {
        Authorization: `Bearer ${loginData.data.token}`,
      },
    });

    console.log("\n--- Administrator Orders Authorization Test ---");
    console.log("Endpoint: GET /api/orders");
    console.log("HTTP status:", ordersResponse.status);

    if (ordersResponse.status === 200) {
      console.log("\nPASS: Administrators can view all orders.");
    } else {
      console.error(
        `\nFAIL: Expected HTTP 200, received ${ordersResponse.status}.`,
      );
      process.exitCode = 1;
    }
  }
} catch (error) {
  console.error("\nTest failed:", error.message);
  process.exitCode = 1;
}
