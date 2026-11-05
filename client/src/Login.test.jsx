import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Login from "./Login";
import { apiRequest } from "./api";

vi.mock("./api", () => ({
  apiRequest: vi.fn(),
}));

describe("Login component", () => {
  it("successfully logs in a customer", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();

    const customer = {
      id: 1,
      name: "Test Customer",
      email: "customer@test.com",
      role: "customer",
    };

    apiRequest.mockResolvedValue({
      status: "success",
      data: {
        token: "customer-token",
        user: customer,
      },
    });

    render(<Login onLogin={onLogin} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "customer@test.com",
    );

    await user.type(
      screen.getByLabelText(/password/i),
      "password123",
    );

    await user.click(
      screen.getByRole("button", { name: /sign in/i }),
    );

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith({
        token: "customer-token",
        user: customer,
      });
    });

    expect(apiRequest).toHaveBeenCalledWith(
      "/auth/login",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("successfully logs in an administrator", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();

    const admin = {
      id: 2,
      name: "Test Admin",
      email: "admin@test.com",
      role: "admin",
    };

    apiRequest.mockResolvedValue({
      status: "success",
      data: {
        token: "admin-token",
        user: admin,
      },
    });

    render(<Login initialRole="admin" onLogin={onLogin} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "admin@test.com",
    );

    await user.type(
      screen.getByLabelText(/password/i),
      "adminpassword",
    );

    await user.click(
      screen.getByRole("button", { name: /sign in/i }),
    );

    await waitFor(() => {
      expect(onLogin).toHaveBeenCalledWith({
        token: "admin-token",
        user: admin,
      });
    });
  });

  it("rejects an account with the wrong role", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();

    apiRequest.mockResolvedValue({
      status: "success",
      data: {
        token: "customer-token",
        user: {
          id: 1,
          email: "customer@test.com",
          role: "customer",
        },
      },
    });

    render(<Login initialRole="admin" onLogin={onLogin} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "customer@test.com",
    );

    await user.type(
      screen.getByLabelText(/password/i),
      "password123",
    );

    await user.click(
      screen.getByRole("button", { name: /sign in/i }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/not registered as an administrator/i);

    expect(onLogin).not.toHaveBeenCalled();
  });

  it("displays an API login error", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();

    apiRequest.mockRejectedValue(
      new Error("Invalid email or password."),
    );

    render(<Login onLogin={onLogin} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "wrong@test.com",
    );

    await user.type(
      screen.getByLabelText(/password/i),
      "wrongpassword",
    );

    await user.click(
      screen.getByRole("button", { name: /sign in/i }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Invalid email or password.");

    expect(onLogin).not.toHaveBeenCalled();
  });

  it("disables the form while login is processing", async () => {
    const user = userEvent.setup();

    let resolveLogin;

    apiRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );

    render(<Login onLogin={vi.fn()} />);

    await user.type(
      screen.getByLabelText(/email address/i),
      "customer@test.com",
    );

    await user.type(
      screen.getByLabelText(/password/i),
      "password123",
    );

    await user.click(
      screen.getByRole("button", { name: /sign in/i }),
    );

    expect(
      screen.getByRole("button", { name: /signing in/i }),
    ).toBeDisabled();

    resolveLogin({
      status: "success",
      data: {
        token: "customer-token",
        user: {
          id: 1,
          email: "customer@test.com",
          role: "customer",
        },
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeEnabled();
    });
  });
});