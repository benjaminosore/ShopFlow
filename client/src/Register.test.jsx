import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Register from "./Register";
import { apiRequest } from "./api";

vi.mock("./api", () => ({
  apiRequest: vi.fn(),
}));

describe("Register component", () => {
  it("successfully registers a customer", async () => {
    const user = userEvent.setup();

    apiRequest.mockResolvedValue({
      message: "Account created successfully.",
    });

    render(<Register onBackToLogin={vi.fn()} />);

    await user.type(
      screen.getByLabelText(/full name/i),
      "  Test Customer  ",
    );

    await user.type(
      screen.getByLabelText(/email address/i),
      "customer@test.com",
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "password123",
    );

    await user.type(
      screen.getByLabelText(/confirm password/i),
      "password123",
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i }),
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/auth/register",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Test Customer",
            email: "customer@test.com",
            password: "password123",
          }),
        }),
      );
    });

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Account created successfully.",
    );

    expect(screen.getByLabelText(/full name/i)).toHaveValue("");
    expect(screen.getByLabelText(/email address/i)).toHaveValue("");
  });

  it("rejects passwords that do not match", async () => {
    const user = userEvent.setup();

    render(<Register onBackToLogin={vi.fn()} />);

    await user.type(
      screen.getByLabelText(/full name/i),
      "Test Customer",
    );

    await user.type(
      screen.getByLabelText(/email address/i),
      "customer@test.com",
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "password123",
    );

    await user.type(
      screen.getByLabelText(/confirm password/i),
      "different123",
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passwords do not match.",
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("rejects passwords shorter than eight characters", async () => {
    render(<Register onBackToLogin={vi.fn()} />);

    const passwordInput = screen.getByLabelText(/^password$/i);
    const form = passwordInput.closest("form");

    fireEvent.change(passwordInput, {
      target: { value: "short" },
    });

    fireEvent.change(
      screen.getByLabelText(/confirm password/i),
      {
        target: { value: "short" },
      },
    );

    fireEvent.submit(form);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Password must be at least 8 characters long.",
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("displays an API registration error", async () => {
    const user = userEvent.setup();

    apiRequest.mockRejectedValue(
      new Error("Email address is already registered."),
    );

    render(<Register onBackToLogin={vi.fn()} />);

    await user.type(
      screen.getByLabelText(/full name/i),
      "Test Customer",
    );

    await user.type(
      screen.getByLabelText(/email address/i),
      "existing@test.com",
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "password123",
    );

    await user.type(
      screen.getByLabelText(/confirm password/i),
      "password123",
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email address is already registered.",
    );
  });

  it("disables the form while registration is processing", async () => {
    const user = userEvent.setup();

    let resolveRegistration;

    apiRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveRegistration = resolve;
      }),
    );

    render(<Register onBackToLogin={vi.fn()} />);

    await user.type(
      screen.getByLabelText(/full name/i),
      "Test Customer",
    );

    await user.type(
      screen.getByLabelText(/email address/i),
      "customer@test.com",
    );

    await user.type(
      screen.getByLabelText(/^password$/i),
      "password123",
    );

    await user.type(
      screen.getByLabelText(/confirm password/i),
      "password123",
    );

    await user.click(
      screen.getByRole("button", { name: /create account/i }),
    );

    expect(
      screen.getByRole("button", { name: /creating account/i }),
    ).toBeDisabled();

    resolveRegistration({
      message: "Account created successfully.",
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create account/i }),
      ).toBeEnabled();
    });
  });

  it("calls onBackToLogin when the sign-in button is clicked", async () => {
    const user = userEvent.setup();
    const onBackToLogin = vi.fn();

    render(<Register onBackToLogin={onBackToLogin} />);

    await user.click(
      screen.getByRole("button", { name: /^sign in$/i }),
    );

    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });
});