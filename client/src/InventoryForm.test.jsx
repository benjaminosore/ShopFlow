import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InventoryForm from "./InventoryForm";
import { apiRequest } from "./api";

vi.mock("./api", () => ({
  apiRequest: vi.fn(),
}));

const product = {
  id: 5,
  name: "Wireless Keyboard",
  stock_quantity: 20,
};

describe("InventoryForm component", () => {
  it("successfully increases inventory", async () => {
    const user = userEvent.setup();
    const onInventoryAdjusted = vi.fn();

    const updatedProduct = {
      ...product,
      stock_quantity: 25,
    };

    apiRequest.mockResolvedValue({
      data: updatedProduct,
    });

    render(
      <InventoryForm
        token="test-admin-token"
        product={product}
        onInventoryAdjusted={onInventoryAdjusted}
      />,
    );

    expect(
      screen.getByText("20 units"),
    ).toBeInTheDocument();

    await user.clear(
      screen.getByLabelText(/adjustment/i),
    );

    await user.type(
      screen.getByLabelText(/adjustment/i),
      "5",
    );

    expect(
      screen.getByText("25 units"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /update inventory/i,
      }),
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/products/5/inventory",
        {
          method: "PATCH",
          token: "test-admin-token",
          body: JSON.stringify({
            adjustment: 5,
          }),
        },
      );
    });

    expect(onInventoryAdjusted).toHaveBeenCalledWith(
      updatedProduct,
    );
  });

  it("successfully decreases inventory", async () => {
    const user = userEvent.setup();

    const updatedProduct = {
      ...product,
      stock_quantity: 15,
    };

    apiRequest.mockResolvedValue({
      data: updatedProduct,
    });

    const onInventoryAdjusted = vi.fn();

    render(
      <InventoryForm
        token="test-token"
        product={product}
        onInventoryAdjusted={onInventoryAdjusted}
      />,
    );

    await user.clear(
      screen.getByLabelText(/adjustment/i),
    );

    await user.type(
      screen.getByLabelText(/adjustment/i),
      "-5",
    );

    expect(
      screen.getByText("15 units"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /update inventory/i,
      }),
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/products/5/inventory",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({
            adjustment: -5,
          }),
        }),
      );
    });

    expect(onInventoryAdjusted).toHaveBeenCalledWith(
      updatedProduct,
    );
  });

  it("rejects a zero adjustment", async () => {
    render(
      <InventoryForm
        token="test-token"
        product={product}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/adjustment/i),
      { target: { value: "0" } },
    );

    const form = screen
      .getByLabelText(/adjustment/i)
      .closest("form");

    fireEvent.submit(form);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Enter a non-zero whole number.",
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("rejects a fractional adjustment", async () => {
    render(
      <InventoryForm
        token="test-token"
        product={product}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/adjustment/i),
      { target: { value: "2.5" } },
    );

    const form = screen
      .getByLabelText(/adjustment/i)
      .closest("form");

    fireEvent.submit(form);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Enter a non-zero whole number.",
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("rejects an adjustment that would produce negative stock", async () => {
    render(
      <InventoryForm
        token="test-token"
        product={product}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/adjustment/i),
      { target: { value: "-25" } },
    );

    const form = screen
      .getByLabelText(/adjustment/i)
      .closest("form");

    fireEvent.submit(form);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "This adjustment would reduce stock below zero.",
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("rejects an unsafe integer adjustment", async () => {
    render(
      <InventoryForm
        token="test-token"
        product={product}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/adjustment/i),
      { target: { value: "9007199254740992" } },
    );

    const form = screen
      .getByLabelText(/adjustment/i)
      .closest("form");

    fireEvent.submit(form);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Enter a non-zero whole number.",
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("displays an API error when inventory adjustment fails", async () => {
    const user = userEvent.setup();

    apiRequest.mockRejectedValue(
      new Error("Unable to update inventory."),
    );

    render(
      <InventoryForm
        token="test-token"
        product={product}
      />,
    );

    await user.clear(
      screen.getByLabelText(/adjustment/i),
    );

    await user.type(
      screen.getByLabelText(/adjustment/i),
      "5",
    );

    await user.click(
      screen.getByRole("button", {
        name: /update inventory/i,
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Unable to update inventory.",
    );
  });

  it("disables controls while inventory is being updated", async () => {
    const user = userEvent.setup();

    let resolveRequest;

    apiRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(
      <InventoryForm
        token="test-token"
        product={product}
      />,
    );

    await user.clear(
      screen.getByLabelText(/adjustment/i),
    );

    await user.type(
      screen.getByLabelText(/adjustment/i),
      "5",
    );

    await user.click(
      screen.getByRole("button", {
        name: /update inventory/i,
      }),
    );

    expect(
      screen.getByRole("button", {
        name: /updating stock/i,
      }),
    ).toBeDisabled();

    expect(
      screen.getByLabelText(/adjustment/i),
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: /cancel/i,
      }),
    ).toBeDisabled();

    resolveRequest({
      data: {
        ...product,
        stock_quantity: 25,
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /update inventory/i,
        }),
      ).toBeEnabled();
    });
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <InventoryForm
        token="test-token"
        product={product}
        onCancel={onCancel}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /cancel/i,
      }),
    );

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});