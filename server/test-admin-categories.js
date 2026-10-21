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

let password;

try {
  password = await askHidden(
    "Enter the administrator account password (hidden): "
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const baseUrl = "http://localhost:5000/api";
const testName = `Admin Security Test ${Date.now()}`;

const headers = {
  "Content-Type": "application/json"
};

let token;
let categoryId;
let failures = 0;

async function runTest(label, request, expectedStatus) {
  console.log(`\n--- ${label} ---`);

  try {
    const response = await request();
    const responseText = await response.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    console.log("HTTP status:", response.status);
    console.log("Response:", JSON.stringify(data));

    if (response.status === expectedStatus) {
      console.log(`PASS: ${label}`);
      return data;
    }

    console.error(
      `FAIL: Expected HTTP ${expectedStatus}, received ${response.status}.`
    );
    failures++;
    return null;
  } catch (error) {
    console.error(`FAIL: ${label} — ${error.message}`);
    failures++;
    return null;
  }
}

try {
  const login = await runTest(
    "Administrator login",
    () =>
      fetch(`${baseUrl}/auth/login`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: "admin@shopflow.local",
          password
        })
      }),
    200
  );

  if (!login?.data?.token) {
    console.error(
      "\nCannot continue because administrator login did not return a token."
    );
    process.exitCode = 1;
  } else {
    token = login.data.token;
    console.log("\nAdministrator login successful.");

    const authHeaders = {
      ...headers,
      Authorization: `Bearer ${token}`
    };

    // Test category creation.
    const created = await runTest(
      "Administrator creates a category",
      () =>
        fetch(`${baseUrl}/categories`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            name: testName,
            description: "Temporary administrator permission test"
          })
        }),
      201
    );

    if (created?.data?.id) {
      categoryId = created.data.id;

      // Test category updating.
      await runTest(
        "Administrator updates a category",
        () =>
          fetch(`${baseUrl}/categories/${categoryId}`, {
            method: "PUT",
            headers: authHeaders,
            body: JSON.stringify({
              name: `${testName} Updated`,
              description: "Updated by administrator authorization test"
            })
          }),
        200
      );
    } else {
      console.error(
        "\nSkipping update test because category creation failed."
      );
      failures++;
    }
  }
} catch (error) {
  console.error("Test execution failed:", error.message);
  failures++;
} finally {
  // Always attempt cleanup if a category was created.
  if (token && categoryId !== undefined) {
    const cleanupHeaders = {
      Authorization: `Bearer ${token}`
    };

    await runTest(
      "Remove temporary test category",
      () =>
        fetch(`${baseUrl}/categories/${categoryId}`, {
          method: "DELETE",
          headers: cleanupHeaders
        }),
      200
    );
  } else if (categoryId === undefined) {
    console.log("\nNo temporary category was created; cleanup is unnecessary.");
  }
}

if (failures > 0) {
  console.error(`\nAdministrator test suite finished with ${failures} failure(s).`);
  process.exitCode = 1;
} else {
  console.log("\nAll administrator category authorization tests passed.");
}