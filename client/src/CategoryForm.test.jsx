import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CategoryForm from "./CategoryForm";
import { apiRequest } from "./api";

vi.mock("./api", () => ({
  apiRequest: vi.fn(),
}));

describe("CategoryForm component", () => {
  it("successfully creates a category with trimmed values", async () => {
    const user = userEvent.setup();
    const onCategoryCreated = vi.fn();

    const newCategory = {
      id: 15,
      name: "Electronics",
      description: "Electronic products",
    };

    apiRequest.mockResolvedValue({
      data: newCategory,
    });

    render(
      <CategoryForm
        token="test-admin-token"
        onCategoryCreated={onCategoryCreated}
      />,
    );

    await user.type(
      screen.getByLabelText(/category name/i),
      "  Electronics  ",
    );

    await user.type(
      screen.getByLabelText(/description/i),
      "  Electronic products  ",
    );

    await user.click(
      screen.getByRole("button", {
        name: /create category/i,
      }),
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/categories",
        {
          method: "POST",
          token: "test-admin-token",
          body: JSON.stringify({
            name: "Electronics",
            description: "Electronic products",
          }),
        },
      );
    });

    expect(onCategoryCreated).toHaveBeenCalledWith(
      newCategory,
    );
  });

  it("rejects an empty category name", async () => {
    const onCategoryCreated = vi.fn();

    render(
      <CategoryForm
        token="test-token"
        onCategoryCreated={onCategoryCreated}
      />,
    );

    const form = screen
      .getByRole("button", { name: /create category/i })
      .closest("form");

    fireEvent.submit(form);

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Category name is required.");

    expect(apiRequest).not.toHaveBeenCalled();
    expect(onCategoryCreated).not.toHaveBeenCalled();
  });

  it("sends null when the category description is empty", async () => {
    const user = userEvent.setup();

    apiRequest.mockResolvedValue({
      data: {
        id: 16,
        name: "Furniture",
        description: null,
      },
    });

    render(
      <CategoryForm token="test-token" />,
    );

    await user.type(
      screen.getByLabelText(/category name/i),
      "Furniture",
    );

    await user.click(
      screen.getByRole("button", {
        name: /create category/i,
      }),
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/categories",
        {
          method: "POST",
          token: "test-token",
          body: JSON.stringify({
            name: "Furniture",
            description: null,
          }),
        },
      );
    });
  });

  it("displays an API error when category creation fails", async () => {
    const user = userEvent.setup();

    apiRequest.mockRejectedValue(
      new Error("Category already exists."),
    );

    render(
      <CategoryForm token="test-token" />,
    );

    await user.type(
      screen.getByLabelText(/category name/i),
      "Electronics",
    );

    await user.click(
      screen.getByRole("button", {
        name: /create category/i,
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Category already exists.");
  });

  it("prefills and successfully updates an existing category", async () => {
    const user = userEvent.setup();
    const onCategoryUpdated = vi.fn();

    const category = {
      id: 7,
      name: "Old Category",
      description: "Old description",
    };

    apiRequest.mockResolvedValue({});

    render(
      <CategoryForm
        token="test-admin-token"
        category={category}
        onCategoryUpdated={onCategoryUpdated}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /edit category/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/category name/i),
    ).toHaveValue("Old Category");

    expect(
      screen.getByLabelText(/description/i),
    ).toHaveValue("Old description");

    await user.clear(
      screen.getByLabelText(/category name/i),
    );

    await user.type(
      screen.getByLabelText(/category name/i),
      "Updated Category",
    );

    await user.clear(
      screen.getByLabelText(/description/i),
    );

    await user.type(
      screen.getByLabelText(/description/i),
      "Updated description",
    );

    await user.click(
      screen.getByRole("button", {
        name: /save changes/i,
      }),
    );

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/categories/7",
        {
          method: "PUT",
          token: "test-admin-token",
          body: JSON.stringify({
            name: "Updated Category",
            description: "Updated description",
          }),
        },
      );
    });

    expect(onCategoryUpdated).toHaveBeenCalledWith({
      id: 7,
      name: "Updated Category",
      description: "Updated description",
    });
  });

  it("displays an API error when updating a category fails", async () => {
    const user = userEvent.setup();

    apiRequest.mockRejectedValue(
      new Error("Unable to update category."),
    );

    render(
      <CategoryForm
        token="test-token"
        category={{
          id: 7,
          name: "Electronics",
          description: "Electronic products",
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /save changes/i,
      }),
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Unable to update category.");
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
      <CategoryForm token="test-token" />,
    );

    await user.type(
      screen.getByLabelText(/category name/i),
      "Electronics",
    );

    await user.click(
      screen.getByRole("button", {
        name: /create category/i,
      }),
    );

    expect(
      screen.getByRole("button", {
        name: /saving/i,
      }),
    ).toBeDisabled();

    expect(
      screen.getByRole("button", {
        name: /cancel/i,
      }),
    ).toBeDisabled();

    expect(
      screen.getByLabelText(/category name/i),
    ).toBeDisabled();

    resolveRequest({
      data: {
        id: 17,
        name: "Electronics",
        description: null,
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: /create category/i,
        }),
      ).toBeEnabled();
    });
  });

  it("calls onCancel when the cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <CategoryForm
        token="test-token"
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