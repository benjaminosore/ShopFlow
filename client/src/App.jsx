import { useEffect, useState } from "react";
import "./App.css";

import Login from "./Login";
import Register from "./Register";
import Welcome from "./Welcome";

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

function formatDate(date) {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function App() {
  const [screen, setScreen] = useState("welcome");
  const [session, setSession] = useState(null);
  const [selectedLoginRole, setSelectedLoginRole] = useState("customer");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Customer shopping cart.
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartNotice, setCartNotice] = useState("");

  // Customer checkout.
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  // Administrator forms.
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [inventoryProduct, setInventoryProduct] = useState(null);

  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState("");

  const [deletingProductId, setDeletingProductId] = useState(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  // Administrator order management.
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false);
  const [orderActionId, setOrderActionId] = useState(null);

  // Load products and categories for authenticated users.
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

  // Load all orders for the administrator.
  useEffect(() => {
    if (!session?.token || session.user?.role !== "admin") {
      setOrders([]);
      return;
    }

    let cancelled = false;

    async function loadOrders() {
      try {
        setOrdersLoading(true);
        setOrdersError("");

        const result = await apiRequest("/orders", {
          token: session.token,
        });

        if (!cancelled) {
          setOrders(result.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setOrdersError(
            err.message || "Unable to load customer orders.",
          );
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [session?.token, session?.user?.role, refreshKey]);

  // Refresh administrator orders.
  async function refreshOrders() {
    if (!session?.token) {
      return;
    }

    try {
      setOrdersLoading(true);
      setOrdersError("");

      const result = await apiRequest("/orders", {
        token: session.token,
      });

      setOrders(result.data || []);
    } catch (err) {
      setOrdersError(err.message || "Unable to refresh orders.");
    } finally {
      setOrdersLoading(false);
    }
  }

  // View individual order details.
  async function handleViewOrder(orderId) {
    if (!session?.token) {
      return;
    }

    setOrderDetailsLoading(true);
    setOrdersError("");

    try {
      const result = await apiRequest(`/orders/${orderId}`, {
        token: session.token,
      });

      setSelectedOrder(result.data);
    } catch (err) {
      setOrdersError(
        err.message || "Unable to load order details.",
      );
    } finally {
      setOrderDetailsLoading(false);
    }
  }

  // Close order details.
  function handleCloseOrderDetails() {
    setSelectedOrder(null);
    setOrdersError("");
  }

  // Update an order's status.
  async function handleUpdateOrderStatus(order, status) {
    if (!session?.token || !order?.id) {
      return;
    }

    setOrderActionId(order.id);
    setOrdersError("");
    setNotice("");

    try {
      await apiRequest(`/orders/${order.id}`, {
        method: "PUT",
        token: session.token,
        body: JSON.stringify({ status }),
      });

      setNotice(`Order #${order.id} status updated to ${status}.`);

      await refreshOrders();

      if (
        selectedOrder &&
        Number(selectedOrder.id) === Number(order.id)
      ) {
        await handleViewOrder(order.id);
      }
    } catch (err) {
      setOrdersError(
        err.message || "Unable to update the order status.",
      );
    } finally {
      setOrderActionId(null);
    }
  }

  // Delete an order.
  async function handleDeleteOrder(order) {
    const confirmed = window.confirm(
      `Delete order #${order.id} permanently? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setOrderActionId(order.id);
    setOrdersError("");
    setNotice("");

    try {
      await apiRequest(`/orders/${order.id}`, {
        method: "DELETE",
        token: session.token,
      });

      setNotice(`Order #${order.id} deleted successfully.`);

      if (
        selectedOrder &&
        Number(selectedOrder.id) === Number(order.id)
      ) {
        setSelectedOrder(null);
      }

      await refreshOrders();
    } catch (err) {
      setOrdersError(
        err.message || "Unable to delete the order.",
      );
    } finally {
      setOrderActionId(null);
    }
  }

  // Administrator login handler.
  function handleAdminLogin(adminSession) {
    if (adminSession.user?.role !== "admin") {
      setError("Administrator access required.");
      return;
    }

    setError("");
    setSession(adminSession);
    setScreen("dashboard");
  }

  // Customer login handler.
  function handleCustomerLogin(customerSession) {
    if (customerSession.user?.role !== "customer") {
      setError("Customer access required.");
      return;
    }

    setError("");
    setSearch("");
    setSelectedCategory("all");
    setCart([]);
    setCartOpen(false);
    setCartNotice("");

    setCheckoutOpen(false);
    setCustomerPhone("");
    setShippingAddress("");
    setDeliveryNotes("");
    setCheckoutError("");
    setOrderConfirmation(null);

    setSession(customerSession);
    setScreen("customer-dashboard");
  }

  // Shared login handler. The backend-authenticated role determines the destination.
  function handleLogin(authenticatedSession) {
    const role = authenticatedSession.user?.role;

    if (role === "admin") {
      handleAdminLogin(authenticatedSession);
    } else if (role === "customer") {
      handleCustomerLogin(authenticatedSession);
    } else {
      setError("Invalid account role. Please contact support.");
    }
  }

  // =========================================
  // CUSTOMER CART FUNCTIONS
  // =========================================

  function handleAddToCart(product) {
    const stock = Number(product.stock_quantity || 0);

    if (stock <= 0) {
      setCartNotice("This product is currently out of stock.");
      return;
    }

    const existingItem = cart.find(
      (item) => Number(item.id) === Number(product.id),
    );

    if (existingItem && existingItem.quantity >= stock) {
      setCartNotice(
        `Only ${stock} units of ${product.name} are available.`,
      );
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => Number(item.id) === Number(product.id),
      );

      if (existing) {
        return currentCart.map((item) =>
          Number(item.id) === Number(product.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });

    setOrderConfirmation(null);
    setCartNotice(`${product.name} added to your cart.`);
  }

  function handleIncreaseQuantity(productId) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (Number(item.id) !== Number(productId)) {
          return item;
        }

        const currentProduct = products.find(
          (product) => Number(product.id) === Number(productId),
        );

        const availableStock = Number(
          currentProduct?.stock_quantity ?? item.stock_quantity ?? 0,
        );

        if (item.quantity >= availableStock) {
          setCartNotice(
            `Only ${availableStock} units are available.`,
          );

          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        };
      }),
    );
  }

  function handleDecreaseQuantity(productId) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          Number(item.id) === Number(productId)
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );

    setCartNotice("");
  }

  function handleRemoveFromCart(productId) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => Number(item.id) !== Number(productId),
      ),
    );

    setCartNotice("Product removed from your cart.");
  }

  function handleClearCart() {
    setCart([]);
    setCheckoutOpen(false);
    setCheckoutError("");
    setCartNotice("Your cart has been cleared.");
  }

  // =========================================
  // CUSTOMER CHECKOUT
  // =========================================

  function handleOpenCheckout() {
    if (cart.length === 0) {
      setCartNotice("Add products to your cart before checkout.");
      return;
    }

    setCheckoutError("");
    setCheckoutOpen(true);
  }

  function handleCancelCheckout() {
    if (isPlacingOrder) {
      return;
    }

    setCheckoutOpen(false);
    setCheckoutError("");
  }

  async function handlePlaceOrder(event) {
    event.preventDefault();

    if (isPlacingOrder) {
      return;
    }

    if (!session?.token) {
      setCheckoutError("Please sign in before placing an order.");
      return;
    }

    if (cart.length === 0) {
      setCheckoutError("Your shopping cart is empty.");
      return;
    }

    if (!customerPhone.trim()) {
      setCheckoutError("Please enter your phone number.");
      return;
    }

    if (customerPhone.trim().length > 20) {
      setCheckoutError("Your phone number must not exceed 20 characters.");
      return;
    }

    if (!shippingAddress.trim()) {
      setCheckoutError("Please enter your delivery address.");
      return;
    }

    setCheckoutError("");
    setIsPlacingOrder(true);

    try {
      const result = await apiRequest("/orders", {
        method: "POST",
        token: session.token,
        body: JSON.stringify({
          items: cart.map((item) => ({
            product_id: Number(item.id),
            quantity: item.quantity,
          })),
          customer_phone: customerPhone.trim(),
          shipping_address: shippingAddress.trim(),
          delivery_notes: deliveryNotes.trim() || null,
        }),
      });

      const createdOrder = result.data;

      if (!createdOrder?.id) {
        throw new Error(
          "The order was submitted, but its confirmation could not be retrieved. Please check your orders before trying again.",
        );
      }

      setOrderConfirmation({
        id: createdOrder.id,
        total: createdOrder.total_amount,
        status: createdOrder.status,
      });

      setCart([]);
      setCartOpen(false);
      setCheckoutOpen(false);
      setCartNotice("");

      setCustomerPhone("");
      setShippingAddress("");
      setDeliveryNotes("");

      setRefreshKey((key) => key + 1);
    } catch (err) {
      setCheckoutError(
        err.message || "Unable to place your order. Please try again.",
      );
    } finally {
      setIsPlacingOrder(false);
    }
  }

  const cartItemCount = cart.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total + Number(item.price || 0) * item.quantity,
    0,
  );

  // =========================================
  // ADMINISTRATOR FORM HANDLERS
  // =========================================

  function handleProductCreated() {
    setShowProductForm(false);
    setEditingProduct(null);
    setError("");
    setNotice("Product created successfully.");
    setRefreshKey((key) => key + 1);
  }

  function handleProductUpdated() {
    setShowProductForm(false);
    setEditingProduct(null);
    setError("");
    setNotice("Product updated successfully.");
    setRefreshKey((key) => key + 1);
  }

  function handleInventoryAdjusted() {
    setInventoryProduct(null);
    setError("");
    setNotice("Inventory adjusted successfully.");
    setRefreshKey((key) => key + 1);
  }

  function handleCategoryCreated() {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setError("");
    setNotice("Category created successfully.");
    setRefreshKey((key) => key + 1);
  }

  function handleCategoryUpdated() {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setError("");
    setNotice("Category updated successfully.");
    setRefreshKey((key) => key + 1);
  }

  function handleAddProduct() {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setInventoryProduct(null);
    setEditingProduct(null);
    setError("");
    setNotice("");
    setShowProductForm(true);
  }

  function handleEditProduct(product) {
    setError("");
    setNotice("");
    setShowCategoryForm(false);
    setEditingCategory(null);
    setInventoryProduct(null);
    setEditingProduct(product);
    setShowProductForm(true);
  }

  function handleAdjustInventory(product) {
    setError("");
    setNotice("");
    setShowCategoryForm(false);
    setEditingCategory(null);
    setShowProductForm(false);
    setEditingProduct(null);
    setInventoryProduct(product);
  }

  function handleAddCategory() {
    setError("");
    setNotice("");
    setShowProductForm(false);
    setEditingProduct(null);
    setInventoryProduct(null);
    setEditingCategory(null);
    setShowCategoryForm(true);
  }

  function handleEditCategory(category) {
    setError("");
    setNotice("");
    setShowProductForm(false);
    setEditingProduct(null);
    setInventoryProduct(null);
    setEditingCategory(category);
    setShowCategoryForm(true);
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

  function handleCancelCategoryForm() {
    setShowCategoryForm(false);
    setEditingCategory(null);
    setError("");
  }

  // Delete a product.
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

  // Delete a category.
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

  // Sign out and clear the active session.
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

    setOrders([]);
    setOrdersError("");
    setSelectedOrder(null);

    setSearch("");
    setSelectedCategory("all");

    setCart([]);
    setCartOpen(false);
    setCartNotice("");

    setCheckoutOpen(false);
    setCustomerPhone("");
    setShippingAddress("");
    setDeliveryNotes("");
    setCheckoutError("");
    setOrderConfirmation(null);

    setSelectedLoginRole("customer");
    setScreen("welcome");
  }

  // =========================================
  // ADMINISTRATOR STATISTICS
  // =========================================

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

  // Customer product search and category filtering.
  const customerProducts = products.filter((product) => {
    const matchesSearch = `${product.name} ${
      product.category_name || ""
    } ${product.description || ""}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" ||
      String(product.category_id) === String(selectedCategory) ||
      String(product.category_name || "").toLowerCase() ===
        String(
          categories.find(
            (category) =>
              String(category.id) === String(selectedCategory),
          )?.name || "",
        ).toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // =========================================
  // WELCOME PAGE AND SHARED LOGIN
  // =========================================

  if (screen === "welcome") {
    return (
      <Welcome
        onContinue={(role) => {
          setSelectedLoginRole(role);
          setScreen("login");
        }}
      />
    );
  }

  if (screen === "login") {
    return (
      <Login
        initialRole={selectedLoginRole}
        onLogin={handleLogin}
        onBackToWelcome={() => setScreen("welcome")}
        onShowRegister={() => {
          setSelectedLoginRole("customer");
          setScreen("register");
        }}
      />
    );
  }

  if (screen === "register") {
    return (
      <Register
        onBackToLogin={() => {
          setError("");
          setSelectedLoginRole("customer");
          setScreen("login");
        }}
      />
    );
  }

  // =========================================
  // CUSTOMER SHOPPING WORKSPACE
  // =========================================

  if (screen === "customer-dashboard") {
    return (
      <div className="customer-dashboard">
        <header className="customer-header">
          <div className="customer-brand">
            <div className="customer-brand-mark">S</div>
            <h1>ShopFlow</h1>
          </div>

          <div className="customer-account">
            <span>Welcome, {session.user.name}</span>

            <button
              type="button"
              className="customer-cart-button"
              onClick={() => {
                setCartOpen(!cartOpen);
                setCheckoutOpen(false);
              }}
              aria-label={`Shopping cart with ${cartItemCount} items`}
            >
              🛒 Cart
              <span className="customer-cart-count">
                {cartItemCount}
              </span>
            </button>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="customer-main">
          <section className="customer-hero">
            <p className="customer-eyebrow">
              YOUR SHOPPING SPACE
            </p>

            <h2>Discover products you'll love.</h2>

            <p>
              Explore our collection and find everything you need.
            </p>
          </section>

          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}

          {orderConfirmation && (
            <section className="customer-order-confirmation" role="status">
              <div className="customer-order-confirmation-icon">
                ✓
              </div>

              <h2>Order placed successfully!</h2>

              <p>
                Thank you for shopping with ShopFlow.
                Your order has been received.
              </p>

              <div className="customer-order-confirmation-details">
                <div>
                  <span>Order number</span>
                  <strong>#{orderConfirmation.id}</strong>
                </div>

                <div>
                  <span>Order total</span>
                  <strong>
                    {formatCurrency(orderConfirmation.total)}
                  </strong>
                </div>

                <div>
                  <span>Order status</span>
                  <strong>
                    {orderConfirmation.status || "pending"}
                  </strong>
                </div>
              </div>

              <p className="customer-order-pending-note">
                Your order is currently awaiting processing.
                Payment is not collected through this checkout yet.
              </p>

              <button
                type="button"
                onClick={() => setOrderConfirmation(null)}
              >
                Continue Shopping
              </button>
            </section>
          )}

          {cartOpen && (
            <section className="customer-cart-panel">
              <div className="customer-cart-heading">
                <div>
                  <p className="customer-eyebrow">YOUR SELECTION</p>
                  <h2>Shopping Cart</h2>
                </div>

                <button
                  type="button"
                  className="customer-cart-close"
                  onClick={() => {
                    setCartOpen(false);
                    setCheckoutOpen(false);
                  }}
                >
                  Close
                </button>
              </div>

              {cartNotice && (
                <p className="customer-cart-notice" role="status">
                  {cartNotice}
                </p>
              )}

              {cart.length === 0 ? (
                <div className="customer-empty-state">
                  <h3>Your cart is empty</h3>
                  <p>
                    Explore our collection and add products to your cart.
                  </p>
                </div>
              ) : (
                <>
                  <div className="customer-cart-items">
                    {cart.map((item) => (
                      <article
                        className="customer-cart-item"
                        key={item.id}
                      >
                        <div className="customer-cart-item-info">
                          <h3>{item.name}</h3>

                          <p>{formatCurrency(item.price)} each</p>
                        </div>

                        <div className="customer-quantity-controls">
                          <button
                            type="button"
                            onClick={() =>
                              handleDecreaseQuantity(item.id)
                            }
                            aria-label={`Decrease ${item.name} quantity`}
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            onClick={() =>
                              handleIncreaseQuantity(item.id)
                            }
                            aria-label={`Increase ${item.name} quantity`}
                          >
                            +
                          </button>
                        </div>

                        <strong>
                          {formatCurrency(
                            Number(item.price) * item.quantity,
                          )}
                        </strong>

                        <button
                          type="button"
                          className="customer-remove-button"
                          onClick={() => handleRemoveFromCart(item.id)}
                        >
                          Remove
                        </button>
                      </article>
                    ))}
                  </div>

                  <div className="customer-cart-summary">
                    <div>
                      <span>Total items</span>
                      <strong>{cartItemCount}</strong>
                    </div>

                    <div className="customer-cart-total">
                      <span>Cart total</span>
                      <strong>{formatCurrency(cartTotal)}</strong>
                    </div>

                    <button
                      type="button"
                      className="customer-clear-cart"
                      onClick={handleClearCart}
                    >
                      Clear Cart
                    </button>

                    {!checkoutOpen && (
                      <button
                        type="button"
                        className="customer-checkout-button"
                        onClick={handleOpenCheckout}
                      >
                        Proceed to Checkout
                      </button>
                    )}
                  </div>

                  {checkoutOpen && (
                    <section className="customer-checkout-panel">
                      <div className="customer-checkout-heading">
                        <p className="customer-eyebrow">
                          COMPLETE YOUR ORDER
                        </p>

                        <h2>Delivery Information</h2>

                        <p>
                          Enter your contact and delivery details below.
                        </p>
                      </div>

                      <form onSubmit={handlePlaceOrder}>
                        <div className="customer-checkout-field">
                          <label htmlFor="checkout-phone">
                            Phone Number
                          </label>

                          <input
                            id="checkout-phone"
                            type="tel"
                            placeholder="e.g. 0712345678"
                            value={customerPhone}
                            onChange={(event) =>
                              setCustomerPhone(event.target.value)
                            }
                            maxLength={20}
                            autoComplete="tel"
                            required
                            disabled={isPlacingOrder}
                          />
                        </div>

                        <div className="customer-checkout-field">
                          <label htmlFor="checkout-address">
                            Delivery Address
                          </label>

                          <textarea
                            id="checkout-address"
                            placeholder="Enter your town, estate, building and delivery location..."
                            value={shippingAddress}
                            onChange={(event) =>
                              setShippingAddress(event.target.value)
                            }
                            maxLength={2000}
                            rows={4}
                            autoComplete="street-address"
                            required
                            disabled={isPlacingOrder}
                          />
                        </div>

                        <div className="customer-checkout-field">
                          <label htmlFor="checkout-notes">
                            Delivery Instructions (Optional)
                          </label>

                          <textarea
                            id="checkout-notes"
                            placeholder="Any additional delivery instructions?"
                            value={deliveryNotes}
                            onChange={(event) =>
                              setDeliveryNotes(event.target.value)
                            }
                            rows={3}
                            disabled={isPlacingOrder}
                          />
                        </div>

                        <div className="customer-checkout-summary">
                          <span>Order total</span>

                          <strong>{formatCurrency(cartTotal)}</strong>
                        </div>

                        {checkoutError && (
                          <p
                            className="customer-checkout-error"
                            role="alert"
                          >
                            {checkoutError}
                          </p>
                        )}

                        <div className="customer-checkout-actions">
                          <button
                            type="button"
                            className="customer-checkout-cancel"
                            onClick={handleCancelCheckout}
                            disabled={isPlacingOrder}
                          >
                            Back to Cart
                          </button>

                          <button
                            type="submit"
                            className="customer-place-order-button"
                            disabled={isPlacingOrder || cart.length === 0}
                          >
                            {isPlacingOrder
                              ? "Placing Order..."
                              : "Place Order"}
                          </button>
                        </div>
                      </form>
                    </section>
                  )}
                </>
              )}
            </section>
          )}

          <section className="customer-products">
            <div className="customer-section-heading">
              <div>
                <p className="customer-eyebrow">
                  SHOP OUR COLLECTION
                </p>

                <h2>Explore Products</h2>

                <p>Find your next favourite product.</p>
              </div>

              <span className="customer-product-count">
                {loading
                  ? "Loading..."
                  : `${customerProducts.length} products`}
              </span>
            </div>

            <div className="customer-toolbar">
              <input
                type="search"
                placeholder="Search products..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search products"
              />

              <select
                value={selectedCategory}
                onChange={(event) =>
                  setSelectedCategory(event.target.value)
                }
                aria-label="Filter products by category"
              >
                <option value="all">All Categories</option>

                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="customer-empty-state">
                <h3>Loading products...</h3>
                <p>
                  Please wait while we fetch our collection.
                </p>
              </div>
            ) : customerProducts.length === 0 ? (
              <div className="customer-empty-state">
                <h3>No products found</h3>
                <p>
                  Try changing your search or selecting another category.
                </p>
              </div>
            ) : (
              <div className="customer-product-grid">
                {customerProducts.map((product) => {
                  const stock = Number(product.stock_quantity || 0);

                  const cartItem = cart.find(
                    (item) => Number(item.id) === Number(product.id),
                  );

                  const quantityInCart = cartItem?.quantity || 0;

                  const cannotAddMore = quantityInCart >= stock;

                  return (
                    <article
                      className="customer-product-card"
                      key={product.id}
                    >
                      <div className="customer-product-image">
                        <span>SHOPFLOW</span>
                      </div>

                      <div className="customer-product-details">
                        <p className="customer-product-category">
                          {product.category_name || "General"}
                        </p>

                        <h3>{product.name}</h3>

                        <p className="customer-product-description">
                          {product.description ||
                            "Discover this product from our collection."}
                        </p>

                        <div className="customer-product-bottom">
                          <strong>
                            {formatCurrency(product.price)}
                          </strong>

                          <span
                            className={
                              stock > 0
                                ? "customer-in-stock"
                                : "customer-out-of-stock"
                            }
                          >
                            {stock > 0
                              ? `${stock} available`
                              : "Out of stock"}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="customer-add-button"
                          onClick={() => handleAddToCart(product)}
                          disabled={stock <= 0 || cannotAddMore}
                        >
                          {stock <= 0
                            ? "Out of Stock"
                            : cannotAddMore
                              ? "Maximum Stock Added"
                              : "Add to Cart"}
                        </button>

                        {quantityInCart > 0 && (
                          <p className="customer-cart-item-hint">
                            {quantityInCart} in your cart
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>

        <footer className="customer-footer">
          ShopFlow · Smart E-commerce Management
        </footer>
      </div>
    );
  }

  // =========================================
  // ADMINISTRATOR DASHBOARD
  // =========================================

  if (!session || session.user?.role !== "admin") {
    return (
      <Welcome
        onContinue={(role) => {
          setSelectedLoginRole(role);
          setScreen("login");
        }}
      />
    );
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
          <a href="#orders">Orders</a>
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

        {/* =========================================
            ADMINISTRATOR ORDERS MANAGEMENT
        ========================================= */}

        <section className="panel orders-panel" id="orders">
          <div className="panel-header">
            <div>
              <h2>Customer Orders</h2>
              <p>View and manage orders placed by your customers.</p>
            </div>

            <button
              type="button"
              className="add-product-button"
              onClick={refreshOrders}
              disabled={ordersLoading}
            >
              {ordersLoading ? "Refreshing..." : "Refresh Orders"}
            </button>
          </div>

          {ordersError && (
            <p className="error-message" role="alert">
              {ordersError}
            </p>
          )}

          {ordersLoading && orders.length === 0 ? (
            <div className="orders-empty-state">
              <p>Loading customer orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="orders-empty-state">
              <h3>No orders yet</h3>
              <p>Customer orders will appear here after checkout.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>#{order.id}</strong>
                      </td>

                      <td>
                        <div className="order-customer">
                          <strong>
                            {order.customer_name || "Customer"}
                          </strong>

                          <small>
                            {order.customer_email || "—"}
                          </small>
                        </div>
                      </td>

                      <td>{order.customer_phone || "—"}</td>

                      <td>
                        <strong>
                          {formatCurrency(order.total_amount)}
                        </strong>
                      </td>

                      <td>{formatDate(order.created_at)}</td>

                      <td>
                        <span
                          className={`order-status order-status-${String(
                            order.status || "pending",
                          ).toLowerCase()}`}
                        >
                          {order.status || "pending"}
                        </span>
                      </td>

                      <td>
                        <div className="order-actions">
                          <button
                            type="button"
                            className="edit-product-button"
                            onClick={() => handleViewOrder(order.id)}
                            disabled={orderDetailsLoading}
                          >
                            {orderDetailsLoading &&
                            Number(selectedOrder?.id) ===
                              Number(order.id)
                              ? "Loading..."
                              : "View"}
                          </button>

                          <select
                            className="order-status-select"
                            value={order.status || "pending"}
                            onChange={(event) =>
                              handleUpdateOrderStatus(
                                order,
                                event.target.value,
                              )
                            }
                            disabled={
                              orderActionId !== null ||
                              orderDetailsLoading
                            }
                            aria-label={`Update status for order ${order.id}`}
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>

                          <button
                            type="button"
                            className="delete-product-button"
                            onClick={() => handleDeleteOrder(order)}
                            disabled={orderActionId !== null}
                          >
                            {orderActionId === order.id
                              ? "Working..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected order details */}
          {selectedOrder && (
            <section className="order-details-panel">
              <div className="order-details-heading">
                <div>
                  <p className="eyebrow">ORDER INFORMATION</p>
                  <h3>Order #{selectedOrder.id}</h3>
                </div>

                <button
                  type="button"
                  className="customer-cart-close"
                  onClick={handleCloseOrderDetails}
                >
                  Close Details
                </button>
              </div>

              <div className="order-details-grid">
                <div>
                  <span>Customer</span>
                  <strong>
                    {selectedOrder.customer_name || "—"}
                  </strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>
                    {selectedOrder.customer_email || "—"}
                  </strong>
                </div>

                <div>
                  <span>Phone</span>
                  <strong>
                    {selectedOrder.customer_phone || "—"}
                  </strong>
                </div>

                <div>
                  <span>Order status</span>
                  <strong>
                    {selectedOrder.status || "pending"}
                  </strong>
                </div>

                <div>
                  <span>Order total</span>
                  <strong>
                    {formatCurrency(selectedOrder.total_amount)}
                  </strong>
                </div>

                <div>
                  <span>Order date</span>
                  <strong>
                    {formatDate(selectedOrder.created_at)}
                  </strong>
                </div>
              </div>

              <div className="order-shipping-details">
                <h4>Delivery Information</h4>

                <p>
                  <strong>Address:</strong>{" "}
                  {selectedOrder.shipping_address || "—"}
                </p>

                <p>
                  <strong>Delivery notes:</strong>{" "}
                  {selectedOrder.delivery_notes || "None"}
                </p>
              </div>

              <h4>Purchased Products</h4>

              {orderDetailsLoading ? (
                <p>Loading order items...</p>
              ) : !selectedOrder.items ||
                selectedOrder.items.length === 0 ? (
                <p>No product details are available for this order.</p>
              ) : (
                <div className="table-container">
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedOrder.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.product_name}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unit_price)}</td>
                          <td>
                            {formatCurrency(
                              item.subtotal ??
                                Number(item.unit_price) *
                                  Number(item.quantity),
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </section>

        {/* =========================================
            PRODUCT INVENTORY
        ========================================= */}

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

        {/* =========================================
            PRODUCT CATEGORIES
        ========================================= */}

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