const API_BASE_URL = "http://localhost:5000/api";

export async function apiRequest(
  path,
  { token, ...options } = {},
) {
  const headers = new Headers(options.headers || {});

  // Add JSON content type when sending a JSON request body.
  if (
    options.body != null &&
    !headers.has("Content-Type") &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  // Include the JWT when a request has an authenticated session.
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE_URL}${normalizedPath}`;

  let response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Could not connect to ShopFlow. Check that the backend is running.",
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      result?.message || `Request failed with status ${response.status}.`,
    );
  }

  if (result?.status === "error") {
    throw new Error(result.message || "ShopFlow API request failed.");
  }

  return result;
}