import { useState } from "react";
import { apiRequest } from "./api";
import "./ProductForm.css";

const initialForm = {
  category_id: "",
  name: "",
  description: "",
  price: "",
  stock_quantity: "0",
  image_url: "",
};

function ProductForm({
  token,
  categories,
  product = null,
  onProductCreated,
  onProductUpdated,
  onCancel,
}) {
  const isEditing = Boolean(product);

  const [form, setForm] = useState(() => ({
    category_id: product ? String(product.category_id) : "",
    name: product?.name || "",
    description: product?.description || "",
    price: product ? String(product.price) : "",
    stock_quantity: product
      ? String(product.stock_quantity ?? 0)
      : "0",
    image_url: product?.image_url || "",
  }));

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!categories.length) {
      setError("Create a product category before managing products.");
      return;
    }

    const categoryId = Number(form.category_id);
    const price = Number(form.price);
    const stockQuantity = Number(form.stock_quantity);

    if (
      !Number.isInteger(categoryId) ||
      categoryId <= 0
    ) {
      setError("Please select a valid category.");
      return;
    }

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid price that is zero or greater.");
      return;
    }

    if (
      !isEditing &&
      (!Number.isInteger(stockQuantity) || stockQuantity < 0)
    ) {
      setError("Stock must be a non-negative whole number.");
      return;
    }

    const payload = {
      category_id: categoryId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      image_url: form.image_url.trim() || null,
    };

    // Initial stock is supplied only when creating a product.
    // Editing product details must never overwrite inventory.
    if (!isEditing) {
      payload.stock_quantity = stockQuantity;
    }

    setSubmitting(true);

    try {
      const result = await apiRequest(
        isEditing ? `/products/${product.id}` : "/products",
        {
          method: isEditing ? "PUT" : "POST",
          token,
          body: JSON.stringify(payload),
        },
      );

      if (isEditing) {
        onProductUpdated?.(product);
      } else {
        setForm(initialForm);
        onProductCreated?.(result.data);
      }
    } catch (err) {
      setError(err.message || "Unable to save the product.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="product-form-panel">
      <div className="product-form-heading">
        <div>
          <p className="product-form-eyebrow">
            PRODUCT MANAGEMENT
          </p>

          <h2>{isEditing ? "Edit product" : "Add a product"}</h2>

          <p>
            {isEditing
              ? "Update product details without changing its stock."
              : "Enter the details for your new product."}
          </p>
        </div>
      </div>

      {error && (
        <div className="product-form-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="product-form-grid">
          <div className="product-form-field">
            <label htmlFor="product-name">Product name *</label>

            <input
              id="product-name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Wireless Keyboard"
              maxLength={255}
              required
              disabled={submitting}
            />
          </div>

          <div className="product-form-field">
            <label htmlFor="product-category">Category *</label>

            <select
              id="product-category"
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
              required
              disabled={submitting || categories.length === 0}
            >
              <option value="">Select a category</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="product-form-field">
            <label htmlFor="product-price">Price (KSh) *</label>

            <input
              id="product-price"
              name="price"
              type="number"
              value={form.price}
              onChange={handleChange}
              placeholder="e.g. 2500"
              min="0"
              step="0.01"
              required
              disabled={submitting}
            />
          </div>

          {!isEditing && (
            <div className="product-form-field">
              <label htmlFor="product-stock">Initial stock *</label>

              <input
                id="product-stock"
                name="stock_quantity"
                type="number"
                value={form.stock_quantity}
                onChange={handleChange}
                min="0"
                step="1"
                required
                disabled={submitting}
              />
            </div>
          )}

          <div className="product-form-field product-form-field--full">
            <label htmlFor="product-description">
              Description
            </label>

            <textarea
              id="product-description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the product..."
              rows="3"
              disabled={submitting}
            />
          </div>

          <div className="product-form-field product-form-field--full">
            <label htmlFor="product-image">
              Image URL (optional)
            </label>

            <input
              id="product-image"
              name="image_url"
              type="url"
              value={form.image_url}
              onChange={handleChange}
              placeholder="https://example.com/product.jpg"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="product-form-actions">
          <button
            className="product-form-cancel"
            type="button"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            className="product-form-submit"
            type="submit"
            disabled={submitting || categories.length === 0}
          >
            {submitting
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Create product"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ProductForm;