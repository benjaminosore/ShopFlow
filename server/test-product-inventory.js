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
      const value = key.toString();

      if (value === "\u0003") {
        cleanup();
        output.write("\n");
        reject(new Error("Password prompt cancelled."));
        return;
      }

      if (value === "\r" || value === "\n") {
        cleanup();
        output.write("\n");
        resolve(password);
        return;
      }

      if (value === "\u007f" || value === "\b") {
        password = password.slice(0, -1);
        return;
      }

      if (!value.startsWith("\u001b")) {
        password += value;
      }
    };

    input.on("data", onData);
  });
}

const baseUrl = "http://localhost:5000/api";

async function login(email, password) {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const body = await response.json();

  if (!response.ok || !body.data?.token) {
    throw new Error(`Login failed for ${email}. Check the credentials.`);
  }

  return body.data.token;
}

async function request(url, method, token, body) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

function check(label, passed, details = "") {
  console.log(`\n${passed ? "PASS" : "FAIL"}: ${label}`);

  if (details) {
    console.log(details);
  }

  if (!passed) {
    failures++;
  }
}

let failures = 0;

try {
  const customerPassword = await askHidden(
    "Enter the customer test-account password (hidden): ",
  );

  const adminPassword = await askHidden(
    "Enter the admin test-account password (hidden): ",
  );

  const customerToken = await login(
    "benjamin.auth@shopflow.local",
    customerPassword,
  );

  const adminToken = await login("admin@shopflow.local", adminPassword);

  console.log("\nBoth test accounts logged in successfully.");

  // Find an existing product without changing anything.
  const productsResponse = await request(`${baseUrl}/products`, "GET");

  const products = productsResponse.data?.data;

  if (
    productsResponse.status !== 200 ||
    !Array.isArray(products) ||
    products.length === 0
  ) {
    throw new Error("Could not find products. Check the server and database.");
  }

  const product = products[0];
  const productUrl = `${baseUrl}/products/${product.id}`;
  const inventoryUrl = `${productUrl}/inventory`;
  const originalStock = Number(product.stock_quantity);

  console.log(`\nTesting product ID: ${product.id}`);
  console.log(`Original stock: ${originalStock}`);

  // 1. Unauthenticated requests must be rejected.
  const noToken = await request(inventoryUrl, "PATCH", null, { adjustment: 1 });

  check(
    "Unauthenticated inventory adjustment is rejected",
    noToken.status === 401,
    `HTTP ${noToken.status}`,
  );

  // 2. Customers must not adjust inventory.
  const customerAttempt = await request(inventoryUrl, "PATCH", customerToken, {
    adjustment: 1,
  });

  check(
    "Customers cannot adjust inventory",
    customerAttempt.status === 403,
    `HTTP ${customerAttempt.status}`,
  );

  // 3. Zero is not a valid adjustment.
  const zeroAdjustment = await request(inventoryUrl, "PATCH", adminToken, {
    adjustment: 0,
  });

  check(
    "Zero inventory adjustment is rejected",
    zeroAdjustment.status === 400,
    `HTTP ${zeroAdjustment.status}`,
  );

  // 4. Attempting to reduce stock below zero must fail.
  const excessiveReduction = await request(inventoryUrl, "PATCH", adminToken, {
    adjustment: -(originalStock + 1),
  });

  check(
    "Inventory cannot be reduced below zero",
    excessiveReduction.status === 409,
    `HTTP ${excessiveReduction.status}`,
  );

  const afterRejectedReduction = await request(productUrl, "GET");

  const stockAfterRejectedReduction = Number(
    afterRejectedReduction.data?.data?.stock_quantity,
  );

  check(
    "Rejected reduction leaves stock unchanged",
    stockAfterRejectedReduction === originalStock,
    `Stock before: ${originalStock}; after: ${stockAfterRejectedReduction}`,
  );

  // 5. Editing product details must not overwrite stock.
  const updateDetails = await request(productUrl, "PUT", adminToken, {
    category_id: product.category_id,
    name: product.name,
    description: product.description,
    price: product.price,
    image_url: product.image_url,
  });

  check(
    "Admin can update product details",
    updateDetails.status === 200,
    `HTTP ${updateDetails.status}`,
  );

  const afterDetailsUpdate = await request(productUrl, "GET");

  const stockAfterDetailsUpdate = Number(
    afterDetailsUpdate.data?.data?.stock_quantity,
  );

  check(
    "Updating product details preserves stock",
    stockAfterDetailsUpdate === originalStock,
    `Stock before: ${originalStock}; after: ${stockAfterDetailsUpdate}`,
  );

  // 6. Increase stock by one, then restore it.
  let stockWasIncreased = false;

  try {
    const increase = await request(inventoryUrl, "PATCH", adminToken, {
      adjustment: 1,
    });

    check(
      "Admin can increase inventory",
      increase.status === 200,
      `HTTP ${increase.status}`,
    );

    if (increase.status === 200) {
      stockWasIncreased = true;

      const afterIncrease = await request(productUrl, "GET");

      const increasedStock = Number(afterIncrease.data?.data?.stock_quantity);

      check(
        "Inventory increases by exactly one",
        increasedStock === originalStock + 1,
        `Expected: ${originalStock + 1}; actual: ${increasedStock}`,
      );
    }
  } finally {
    // Attempt to restore the original stock if the increase succeeded.
    if (stockWasIncreased) {
      const restore = await request(inventoryUrl, "PATCH", adminToken, {
        adjustment: -1,
      });

      if (restore.status !== 200) {
        console.error(
          "\nWARNING: Could not restore stock automatically.",
          "Check product ID",
          product.id,
          "and restore its stock manually.",
        );

        failures++;
      } else {
        const finalProduct = await request(productUrl, "GET");

        const finalStock = Number(finalProduct.data?.data?.stock_quantity);

        check(
          "Test restores the original stock",
          finalStock === originalStock,
          `Expected: ${originalStock}; actual: ${finalStock}`,
        );
      }
    }
  }

  console.log("\n-----------------------------------");

  if (failures > 0) {
    console.log(`${failures} test(s) failed. Review the output above.`);
    process.exitCode = 1;
  } else {
    console.log("All product inventory tests passed.");
  }
} catch (error) {
  console.error("\nTest execution failed:", error.message);
  process.exitCode = 1;
}
