import { useEffect, useState } from "react";
import "./App.css";
import Login from "./Login";
import ProductForm from "./ProductForm";
import InventoryForm from "./InventoryForm";
import { apiRequest } from "./api";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function App() {
  const [session, setSession] = useState(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Product forms and dashboard refresh.
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [inventoryProduct, setInventoryProduct] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState("");

  // Track an ongoing product deletion.
  const [deletingProductId, setDeletingProductId] = useState(null);

  // Load dashboard data after successful login.
  useEffect(() => {
    if (!session?.token) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const [productsResult, categoriesResult] = await Promise.all([
          apiRequest("/products", { token: session.token }),
          apiRequest("/categories", { token: session.token }),
        ]);

        if (!cancelled) {
          setProducts(productsResult.data || []);
          setCategories(categoriesResult.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load ShopFlow data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [session?.token, refreshKey]);

  // Refresh after creating a product.
  function handleProductCreated() {
    setShowProductForm(false);
    setEditingProduct(null);
    setError("");
    setNotice("Product created successfully.");
    setRefreshKey((key) => key + 1);
  }

  // Refresh after editing a product.
  function handleProductUpdated() {
    setShowProductForm(false);
    setEditingProduct(null);
    setError("");
    setNotice("Product updated successfully.");
    setRefreshKey((key) => key + 1);
  }

  // Refresh after adjusting inventory.
  function handleInventoryAdjusted() {
    setInventoryProduct(null);
    setError("");
    setNotice("Inventory adjusted successfully.");
    setRefreshKey((key) => key + 1);
  }

  function handleAddProduct() {
    setEditingProduct(null);
    setInventoryProduct(null);
    setError("");
    setNotice("");
    setShowProductForm(true);
  }

  function handleEditProduct(product) {
    setError("");
    setNotice("");
    setInventoryProduct(null);
    setEditingProduct(product);
    setShowProductForm(true);
  }

  function handleAdjustInventory(product) {
    setError("");
    setNotice("");
    setShowProductForm(false);
    setEditingProduct(null);
    setInventoryProduct(product);
  }

  function handleCancelProductForm() {
    setShowProductForm(false);
    setEditingProduct(null);
    setError("");
  }

  function handleCancelInventoryForm() {
    setInventoryProduct(null);
    setError("");
  }

  // Delete a product after explicit confirmation.
  async function handleDeleteProduct(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" permanently? This cannot be undone. ` +
        "Products referenced by orders cannot be deleted.",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");
    setDeletingProductId(product.id);

    try {
      await apiRequest(`/products/${product.id}`, {
        method: "DELETE",
        token: session.token,
      });

      setNotice(`"${product.name}" was deleted successfully.`);

      // Close a form if it was open for this product.
      if (editingProduct?.id === product.id) {
        setShowProductForm(false);
        setEditingProduct(null);
      }

      if (inventoryProduct?.id === product.id) {
        setInventoryProduct(null);
      }

      // Reload product data and dashboard statistics.
      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(
        err.message || "Unable to delete the product.",
      );
    } finally {
      setDeletingProductId(null);
    }
  }

  function handleLogout() {
    setSession(null);
    setShowProductForm(false);
    setEditingProduct(null);
    setInventoryProduct(null);
    setNotice("");
    setError("");
    setProducts([]);
    setCategories([]);
  }

  const totalUnits = products.reduce(
    (total, product) =>
      total + Number(product.stock_quantity || 0),
    0,
  );

  const totalStockValue = products.reduce(
    (total, product) =>
      total +
      Number(product.price || 0) *
        Number(product.stock_quantity || 0),
    0,
  );

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.category_name || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (!session) {
    return <Login onLogin={setSession} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2>ShopFlow</h2>
        <p>Management Platform</p>

        <nav>
          <a href="#overview">Dashboard</a>
          <a href="#products">Products</a>
          <a href="#categories">Categories</a>
        </nav>
      </aside>

      <main className="main-content" id="overview">
        <header className="page-header">
          <div>
            <p className="eyebrow">YOUR BUSINESS AT A GLANCE</p>
            <h1>Dashboard Overview</h1>
            <p>Welcome to your ShopFlow management workspace.</p>
          </div>

          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Sign out
          </button>
        </header>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        {notice && (
          <p className="success-message" role="status">
            {notice}
          </p>
        )}

        {showProductForm && (
          <ProductForm
            key={editingProduct?.id ?? "new-product"}
            token={session.token}
            categories={categories}
            product={editingProduct}
            onProductCreated={handleProductCreated}
            onProductUpdated={handleProductUpdated}
            onCancel={handleCancelProductForm}
          />
        )}

        {inventoryProduct && (
          <InventoryForm
            key={inventoryProduct.id}
            token={session.token}
            product={inventoryProduct}
            onInventoryAdjusted={handleInventoryAdjusted}
            onCancel={handleCancelInventoryForm}
          />
        )}

        <section className="stats-grid">
          <article className="stat-card">
            <p>Total Products</p>
            <h2>{loading ? "..." : products.length}</h2>
          </article>

          <article className="stat-card">
            <p>Categories</p>
            <h2>{loading ? "..." : categories.length}</h2>
          </article>

          <article className="stat-card">
            <p>Units in Stock</p>
            <h2>{loading ? "..." : totalUnits}</h2>
          </article>

          <article className="stat-card">
            <p>Retail Stock Value</p>
            <h2>
              {loading ? "..." : formatCurrency(totalStockValue)}
            </h2>
          </article>
        </section>

        <section className="panel" id="products">
          <div className="panel-header">
            <div>
              <h2>Product Inventory</h2>
              <p>Products loaded from your database.</p>
            </div>

            <div className="product-toolbar">
              <input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search products"
              />

              <button
                type="button"
                className="add-product-button"
                onClick={handleAddProduct}
              >
                + Add Product
              </button>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5">Loading products...</td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="5">No products found.</td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.category_name || "—"}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.stock_quantity}</td>

                      <td>
                        <div className="product-actions">
                          <button
                            type="button"
                            className="edit-product-button"
                            onClick={() => handleEditProduct(product)}
                            disabled={deletingProductId !== null}
                            aria-label={`Edit ${product.name}`}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="inventory-adjust-button"
                            onClick={() => handleAdjustInventory(product)}
                            disabled={deletingProductId !== null}
                            aria-label={`Adjust stock for ${product.name}`}
                          >
                            Adjust Stock
                          </button>

                          <button
                            type="button"
                            className="delete-product-button"
                            onClick={() => handleDeleteProduct(product)}
                            disabled={deletingProductId !== null}
                            aria-label={`Delete ${product.name}`}
                          >
                            {deletingProductId === product.id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel" id="categories">
          <h2>Product Categories</h2>

          {loading ? (
            <p>Loading categories...</p>
          ) : categories.length === 0 ? (
            <p>No categories found.</p>
          ) : (
            <div className="category-list">
              {categories.map((category) => (
                <article className="category-card" key={category.id}>
                  <h3>{category.name}</h3>
                  <p>
                    {category.description || "No description available."}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          ShopFlow Management Platform · React + Node.js
        </footer>
      </main>
    </div>
  );
}

export default App;