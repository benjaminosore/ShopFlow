import { useEffect, useState } from "react";
import "./App.css";
import Login from "./Login";
import ProductForm from "./ProductForm";
import InventoryForm from "./InventoryForm";
import CategoryForm from "./CategoryForm";
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

  // Product forms, inventory form, and category form.
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [inventoryProduct, setInventoryProduct] = useState(null);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState("");

  // Track ongoing deletions.
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

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

  // Refresh after creating a category.
  function handleCategoryCreated() {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setError("");
    setNotice("Category created successfully.");
    setRefreshKey((key) => key + 1);
  }

  // Refresh after editing a category.
  function handleCategoryUpdated() {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setError("");
    setNotice("Category updated successfully.");
    setRefreshKey((key) => key + 1);
  }

  // Open the form for creating a new product.
  function handleAddProduct() {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setInventoryProduct(null);
    setEditingProduct(null);
    setError("");
    setNotice("");
    setShowProductForm(true);
  }

  // Open the form for editing an existing product.
  function handleEditProduct(product) {
    setError("");
    setNotice("");
    setShowCategoryForm(false);
    setEditingCategory(null);
    setInventoryProduct(null);
    setEditingProduct(product);
    setShowProductForm(true);
  }

  // Open the form for adjusting product inventory.
  function handleAdjustInventory(product) {
    setError("");
    setNotice("");
    setShowCategoryForm(false);
    setEditingCategory(null);
    setShowProductForm(false);
    setEditingProduct(null);
    setInventoryProduct(product);
  }

  // Open the form for creating a category.
  function handleAddCategory() {
    setError("");
    setNotice("");
    setShowProductForm(false);
    setEditingProduct(null);
    setInventoryProduct(null);
    setEditingCategory(null);
    setShowCategoryForm(true);
  }

  // Open the form for editing an existing category.
  function handleEditCategory(category) {
    setError("");
    setNotice("");
    setShowProductForm(false);
    setEditingProduct(null);
    setInventoryProduct(null);
    setEditingCategory(category);
    setShowCategoryForm(true);
  }

  // Close the product form without saving.
  function handleCancelProductForm() {
    setShowProductForm(false);
    setEditingProduct(null);
    setError("");
  }

  // Close the inventory form without saving.
  function handleCancelInventoryForm() {
    setInventoryProduct(null);
    setError("");
  }

  // Close the category form without saving.
  function handleCancelCategoryForm() {
    setShowCategoryForm(false);
    setEditingCategory(null);
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

      if (editingProduct?.id === product.id) {
        setShowProductForm(false);
        setEditingProduct(null);
      }

      if (inventoryProduct?.id === product.id) {
        setInventoryProduct(null);
      }

      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || "Unable to delete the product.");
    } finally {
      setDeletingProductId(null);
    }
  }

  // Delete a category after explicit confirmation.
  async function handleDeleteCategory(category) {
    const confirmed = window.confirm(
      `Delete "${category.name}" permanently? This cannot be undone. ` +
        "Categories used by products cannot be deleted.",
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setNotice("");
    setDeletingCategoryId(category.id);

    try {
      await apiRequest(`/categories/${category.id}`, {
        method: "DELETE",
        token: session.token,
      });

      setNotice(`"${category.name}" was deleted successfully.`);

      // Close the form if it was open for the deleted category.
      if (editingCategory?.id === category.id) {
        setShowCategoryForm(false);
        setEditingCategory(null);
      }

      setRefreshKey((key) => key + 1);
    } catch (err) {
      setError(err.message || "Unable to delete the category.");
    } finally {
      setDeletingCategoryId(null);
    }
  }

  // Clear frontend state when signing out.
  function handleLogout() {
    setSession(null);
    setShowProductForm(false);
    setEditingProduct(null);
    setInventoryProduct(null);
    setShowCategoryForm(false);
    setEditingCategory(null);
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

  // Display the login page until an administrator signs in.
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

        {/* Create or edit product details. */}
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

        {/* Adjust inventory separately from product details. */}
        {inventoryProduct && (
          <InventoryForm
            key={inventoryProduct.id}
            token={session.token}
            product={inventoryProduct}
            onInventoryAdjusted={handleInventoryAdjusted}
            onCancel={handleCancelInventoryForm}
          />
        )}

        {/* Create or edit category details. */}
        {showCategoryForm && (
          <CategoryForm
            key={editingCategory?.id ?? "new-category"}
            token={session.token}
            category={editingCategory}
            onCategoryCreated={handleCategoryCreated}
            onCategoryUpdated={handleCategoryUpdated}
            onCancel={handleCancelCategoryForm}
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
          <div className="panel-header">
            <div>
              <h2>Product Categories</h2>
              <p>Manage the categories used by your products.</p>
            </div>

            <button
              type="button"
              className="add-product-button"
              onClick={handleAddCategory}
              disabled={deletingCategoryId !== null}
            >
              + Add Category
            </button>
          </div>

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

                  <div className="product-actions">
                    <button
                      type="button"
                      className="edit-product-button"
                      onClick={() => handleEditCategory(category)}
                      disabled={deletingCategoryId !== null}
                      aria-label={`Edit ${category.name}`}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-product-button"
                      onClick={() => handleDeleteCategory(category)}
                      disabled={deletingCategoryId !== null}
                      aria-label={`Delete ${category.name}`}
                    >
                      {deletingCategoryId === category.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
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