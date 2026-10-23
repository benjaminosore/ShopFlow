import { useState } from "react";
import { apiRequest } from "./api";
import "./InventoryForm.css";

function InventoryForm({
  token,
  product,
  onInventoryAdjusted,
  onCancel,
}) {
  const [adjustment, setAdjustment] = useState("1");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentStock = Number(product.stock_quantity) || 0;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const amount = Number(adjustment);

    if (!Number.isSafeInteger(amount) || amount === 0) {
      setError("Enter a non-zero whole number.");
      return;
    }

    if (currentStock + amount < 0) {
      setError("This adjustment would reduce stock below zero.");
      return;
    }

    setSubmitting(true);

    try {
      const result = await apiRequest(
        `/products/${product.id}/inventory`,
        {
          method: "PATCH",
          token,
          body: JSON.stringify({
            adjustment: amount,
          }),
        },
      );

      onInventoryAdjusted(result.data);
    } catch (err) {
      setError(
        err.message || "Unable to adjust product inventory.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="inventory-form-panel">
      <div className="inventory-form-heading">
        <p className="inventory-form-eyebrow">
          INVENTORY MANAGEMENT
        </p>

        <h2>Adjust inventory</h2>

        <p>
          Update the available stock for{" "}
          <strong>{product.name}</strong>.
        </p>
      </div>

      <div className="inventory-current-stock">
        <span>Current stock</span>

        <strong>
          {currentStock.toLocaleString("en-KE")} units
        </strong>
      </div>

      {error && (
        <div className="inventory-form-error" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="inventory-form-field">
          <label htmlFor="inventory-adjustment">
            Adjustment (units)
          </label>

          <input
            id="inventory-adjustment"
            name="adjustment"
            type="number"
            step="1"
            value={adjustment}
            onChange={(event) => setAdjustment(event.target.value)}
            placeholder="Enter a positive or negative number"
            required
            disabled={submitting}
          />

          <small>
            Use a positive number to increase stock and a negative
            number to decrease it.
          </small>
        </div>

        <div className="inventory-form-preview">
          <span>Expected stock after adjustment</span>

          <strong>
            {Number.isSafeInteger(Number(adjustment)) &&
            Number(adjustment) !== 0
              ? `${(currentStock + Number(adjustment)).toLocaleString("en-KE")} units`
              : "Enter a valid adjustment"}
          </strong>
        </div>

        <div className="inventory-form-actions">
          <button
            type="button"
            className="inventory-form-cancel"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="inventory-form-submit"
            disabled={submitting}
          >
            {submitting ? "Updating stock..." : "Update inventory"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default InventoryForm;