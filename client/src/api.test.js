import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiRequest } from "./api";

describe("apiRequest", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockResponse = (data, options = {}) => ({
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(data),
  });

  it("successfully sends a GET request", async () => {
    fetch.mockResolvedValue(mockResponse({ status: "success", data: [] }));

    const result = await apiRequest("/products");

    expect(fetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/products`,
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );

    expect(result).toEqual({ status: "success", data: [] });
  });

  it("normalizes request paths without a leading slash", async () => {
    fetch.mockResolvedValue(mockResponse({ status: "success" }));

    await apiRequest("products");

    expect(fetch).toHaveBeenCalledWith(
      `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/products`,
      expect.any(Object),
    );
  });

  it("automatically adds JSON content type when sending a body", async () => {
    fetch.mockResolvedValue(mockResponse({ status: "success" }));

    await apiRequest("/products", {
      method: "POST",
      body: JSON.stringify({ name: "Laptop" }),
    });

    const options = fetch.mock.calls[0][1];

    expect(options.headers.get("Content-Type")).toBe("application/json");
  });

  it("preserves an explicitly provided content type", async () => {
    fetch.mockResolvedValue(mockResponse({ status: "success" }));

    await apiRequest("/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/custom",
      },
      body: "test",
    });

    const options = fetch.mock.calls[0][1];

    expect(options.headers.get("Content-Type")).toBe(
      "application/custom",
    );
  });

  it("includes the JWT authorization header when a token is provided", async () => {
    fetch.mockResolvedValue(mockResponse({ status: "success" }));

    await apiRequest("/orders", {
      token: "test-jwt-token",
    });

    const options = fetch.mock.calls[0][1];

    expect(options.headers.get("Authorization")).toBe(
      "Bearer test-jwt-token",
    );
  });

  it("does not overwrite an existing authorization header when no token is provided", async () => {
    fetch.mockResolvedValue(mockResponse({ status: "success" }));

    await apiRequest("/orders", {
      headers: {
        Authorization: "Custom authorization",
      },
    });

    const options = fetch.mock.calls[0][1];

    expect(options.headers.get("Authorization")).toBe(
      "Custom authorization",
    );
  });

  it("does not automatically add JSON content type to FormData requests", async () => {
    fetch.mockResolvedValue(mockResponse({ status: "success" }));

    const formData = new FormData();
    formData.append("image", "test-image");

    await apiRequest("/products", {
      method: "POST",
      body: formData,
    });

    const options = fetch.mock.calls[0][1];

    expect(options.headers.has("Content-Type")).toBe(false);
  });

  it("displays the API error message for unsuccessful HTTP responses", async () => {
    fetch.mockResolvedValue(
      mockResponse(
        { message: "Product not found." },
        { ok: false, status: 404 },
      ),
    );

    await expect(apiRequest("/products/999")).rejects.toThrow(
      "Product not found.",
    );
  });

  it("uses the HTTP status when an error response has no message", async () => {
    fetch.mockResolvedValue(
      mockResponse({}, { ok: false, status: 500 }),
    );

    await expect(apiRequest("/products")).rejects.toThrow(
      "Request failed with status 500.",
    );
  });

  it("handles API-level errors even when the HTTP response is successful", async () => {
    fetch.mockResolvedValue(
      mockResponse({
        status: "error",
        message: "Insufficient stock.",
      }),
    );

    await expect(apiRequest("/orders")).rejects.toThrow(
      "Insufficient stock.",
    );
  });

  it("uses a default message when an API-level error has no message", async () => {
    fetch.mockResolvedValue(
      mockResponse({ status: "error" }),
    );

    await expect(apiRequest("/orders")).rejects.toThrow(
      "ShopFlow API request failed.",
    );
  });

  it("returns null when a successful response contains invalid JSON", async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
    });

    const result = await apiRequest("/products");

    expect(result).toBeNull();
  });

  it("handles backend connection failures", async () => {
    fetch.mockRejectedValue(new Error("Network error"));

    await expect(apiRequest("/products")).rejects.toThrow(
      "Could not connect to ShopFlow. Check that the backend is running.",
    );
  });
});