import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ProductForm from "./ProductForm";
import { apiRequest } from "./api";

vi.mock("./api", () => ({
  apiRequest: vi.fn(),
}));

const categories = [
  { id: 1, name: "Electronics" },
  { id: 2, name: "Furniture" },
];

describe("ProductForm component", () => {
  it("successfully creates a product with trimmed values", async () => {
    const user = userEvent.setup();
    const onProductCreated = vi.fn();

    const newProduct = {
      id: 20,
      category_id: 1,
      name: "Wireless Keyboard",
      description: "Wireless keyboard",
      price: 2500,
      stock_quantity: 10,
      image_url: null,
    };

    apiRequest.mockResolvedValue({
      data: newProduct,
    });

    render(
      <ProductForm
        token="test-admin-token"
        categories={categories}
        onProductCreated={onProductCreated}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText(/category/i),
      "1",
    );

    await user.type(
      screen.getByLabelText(/product name/i),
      "  Wireless Keyboard  ",
    );

    await user.type(
      screen.getByLabelText(/price/i),
      "2500",
    );

    await user.clear(
      screen.getByLabelText(/initial stock/i),
    );

    await user.type(
      screen.getByLabelText(/initial stock/i),
      "10",
    );

    await user.type(
      screen.getByLabelText(/description/i),
      "  Wireless keyboard  ",
    );

    await user.click(
      screen.getByRole("button", {
        name: /create product/i,
      }),
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/products",
        {
          method: "POST",
          token: "test-admin-token",
          body: JSON.stringify({
            category_id: 1,
            name: "Wireless Keyboard",
            description: "Wireless keyboard",
            price: 2500,
            image_url: null,
            stock_quantity: 10,
          }),
        },
      );
    });

    expect(onProductCreated).toHaveBeenCalledWith(
      newProduct,
    );

    expect(
      screen.getByLabelText(/product name/i),
    ).toHaveValue("");
  });

  it("rejects product management when no categories exist", async () => {
    render(
      <ProductForm
        token="test-token"
        categories={[]}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /create product/i,
      }),
    ).toBeDisabled();

    const form = screen
      .getByLabelText(/product name/i)
      .closest("form");

    fireEvent.submit(form);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Create a product category before managing products.",
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("rejects an invalid category", async () => {
    const formElement = (
      <ProductForm
        token="test-token"
        categories={categories}
      />
    );

    render(formElement);

    await userEvent.setup().type(
      screen.getByLabelText(/product name/i),
      "Keyboard",
    );

    await userEvent.setup().type(
      screen.getByLabelText(/price/i),
      "2500",
    );

    fireEvent.change(
      screen.getByLabelText(/category/i),
      { target: { value: "0" } },
    );

    const form = screen
      .getByLabelText(/product name/i)
      .closest("form");

    fireEvent.submit(form);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Please select a valid category.");

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("rejects an empty product name", async () => {
    render(
      <ProductForm
        token="test-token"
        categories={categories}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/category/i),
      { target: { value: "1" } },
    );

    fireEvent.change(
      screen.getByLabelText(/price/i),
      { target: { value: "2500" } },
    );

    const form = screen
      .getByLabelText(/product name/i)
      .closest("form");

    fireEvent.submit(form);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Product name is required.");

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("rejects a negative price", async () => {
    render(
      <ProductForm
        token="test-token"
        categories={categories}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/category/i),
      { target: { value: "1" } },
    );

    fireEvent.change(
      screen.getByLabelText(/product name/i),
      { target: { value: "Keyboard" } },
    );

    fireEvent.change(
      screen.getByLabelText(/price/i),
      { target: { value: "-100" } },
    );

    const form = screen
      .getByLabelText(/product name/i)
      .closest("form");

    fireEvent.submit(form);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Enter a valid price that is zero or greater.",
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("rejects negative or fractional initial stock", async () => {
    render(
      <ProductForm
        token="test-token"
        categories={categories}
      />,
    );

    fireEvent.change(
      screen.getByLabelText(/category/i),
      { target: { value: "1" } },
    );

    fireEvent.change(
      screen.getByLabelText(/product name/i),
      { target: { value: "Keyboard" } },
    );

    fireEvent.change(
      screen.getByLabelText(/price/i),
      { target: { value: "2500" } },
    );

    fireEvent.change(
      screen.getByLabelText(/initial stock/i),
      { target: { value: "2.5" } },
    );

    const form = screen
      .getByLabelText(/product name/i)
      .closest("form");

    fireEvent.submit(form);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Stock must be a non-negative whole number.",
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("updates product details without sending stock quantity", async () => {
    const user = userEvent.setup();
    const onProductUpdated = vi.fn();

    const product = {
      id: 5,
      category_id: 1,
      name: "Old Keyboard",
      description: "Old description",
      price: 1500,
      stock_quantity: 25,
      image_url: null,
    };

    apiRequest.mockResolvedValue({});

    render(
      <ProductForm
        token="test-admin-token"
        categories={categories}
        product={product}
        onProductUpdated={onProductUpdated}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /edit product/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByLabelText(/initial stock/i),
    ).not.toBeInTheDocument();

    await user.clear(
      screen.getByLabelText(/product name/i),
    );

    await user.type(
      screen.getByLabelText(/product name/i),
      "Updated Keyboard",
    );

    await user.clear(
      screen.getByLabelText(/price/i),
    );

    await user.type(
      screen.getByLabelText(/price/i),
      "3000",
    );

    await user.click(
      screen.getByRole("button", {
        name: /save changes/i,
      }),
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/products/5",
        {
          method: "PUT",
          token: "test-admin-token",
          body: JSON.stringify({
            category_id: 1,
            name: "Updated Keyboard",
            description: "Old description",
            price: 3000,
            image_url: null,
          }),
        },
      );
    });

    const submittedPayload = JSON.parse(
      apiRequest.mock.calls[0][1].body,
    );

    expect(submittedPayload).not.toHaveProperty(
      "stock_quantity",
    );

    expect(onProductUpdated).toHaveBeenCalledWith(product);
  });

  it("displays an API error when product creation fails", async () => {
    const user = userEvent.setup();

    apiRequest.mockRejectedValue(
      new Error("Unable to create product."),
    );

    render(
      <ProductForm
        token="test-token"
        categories={categories}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText(/category/i),
      "1",
    );

    await user.type(
      screen.getByLabelText(/product name/i),
      "Keyboard",
    );

    await user.type(
      screen.getByLabelText(/price/i),
      "2500",
    );

    await user.click(
      screen.getByRole("button", {
        name: /create product/i,
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Unable to create product.");
  });

  it("disables the form while saving", async () => {
    const user = userEvent.setup();

    let resolveRequest;

    apiRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    render(
      <ProductForm
        token="test-token"
        categories={categories}
      />,
    );

    await user.selectOptions(
      screen.getByLabelText(/category/i),
      "1",
    );

    await user.type(
      screen.getByLabelText(/product name/i),
      "Keyboard",
    );

    await user.type(
      screen.getByLabelText(/price/i),
      "2500",
    );

    await user.click(
      screen.getByRole("button", {
        name: /create product/i,
      }),
    );

    expect(
      screen.getByRole("button", {
        name: /saving/i,
      }),
    ).toBeDisabled();

    expect(
      screen.getByLabelText(/product name/i),
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: /cancel/i,
      }),
    ).toBeDisabled();

    resolveRequest({
      data: {
        id: 21,
        name: "Keyboard",
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /create product/i,
        }),
      ).toBeEnabled();
    });
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <ProductForm
        token="test-token"
        categories={categories}
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