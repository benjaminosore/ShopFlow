import { useState } from "react";
import { apiRequest } from "./api";
import "./CategoryForm.css";

function CategoryForm({
  token,
  category = null,
  onCategoryCreated,
  onCategoryUpdated,
  onCancel,
}) {
  const isEditing = Boolean(category);

  const [form, setForm] = useState({
    name: category?.name || "",
    description: category?.description || "",
  });

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

    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) {
      setError("Category name is required.");
      return;
    }

    const payload = {
      name,
      description: description || null,
    };

    setSubmitting(true);

    try {
      if (isEditing) {
        await apiRequest(`/categories/${category.id}`, {
          method: "PUT",
          token,
          body: JSON.stringify(payload),
        });

        onCategoryUpdated?.({
          ...category,
          ...payload,
        });
      } else {
        const result = await apiRequest("/categories", {
          method: "POST",
          token,
          body: JSON.stringify(payload),
        });

        onCategoryCreated?.(result.data);
      }
    } catch (err) {
      setError(
        err.message || "Unable to save the category.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="category-form-panel">
      <div className="category-form-heading">
        <p className="category-form-eyebrow">
          CATEGORY MANAGEMENT
        </p>

        <h2>{isEditing ? "Edit category" : "Add a category"}</h2>

        <p>
          {isEditing
            ? "Update the name or description of this category."
            : "Create a category to organize your products."}
        </p>
      </div>

      {error && (
        <div className="category-form-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="category-form-field">
          <label htmlFor="category-name">Category name *</label>

          <input
            id="category-name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Home Appliances"
            maxLength={255}
            required
            disabled={submitting}
          />
        </div>

        <div className="category-form-field">
          <label htmlFor="category-description">
            Description
          </label>

          <textarea
            id="category-description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe this product category..."
            rows="4"
            disabled={submitting}
          />
        </div>

        <div className="category-form-actions">
          <button
            type="button"
            className="category-form-cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="category-form-submit"
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : isEditing
                ? "Save changes"
                : "Create category"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default CategoryForm;