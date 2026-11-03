import { useState } from "react";
import "./Login.css";

const API_URL = "http://localhost:5000/api";

function Login({
onLogin,
onBackToWelcome,
onShowRegister,
initialRole = "customer",
}) {
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [accountType, setAccountType] = useState(initialRole);
const [error, setError] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);

async function handleSubmit(event) {
event.preventDefault();

setError("");
setIsSubmitting(true);

try {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  const result = await response.json();

  if (
    !response.ok ||
    result.status !== "success" ||
    !result.data?.token ||
    !result.data?.user
  ) {
    throw new Error(result.message || "Login failed.");
  }

  const { token, user } = result.data;

  if (user.role !== accountType) {
    const accountLabel =
  accountType === "admin" ? "an administrator" : "a customer";

throw new Error(
  `This account is not registered as ${accountLabel}. Please select the correct account type.`,
);
  }

  onLogin({ token, user });
} catch (err) {
  if (err instanceof TypeError) {
    setError(
      "Unable to connect to ShopFlow. Check that the backend is running.",
    );
  } else {
    setError(err.message || "Unable to sign in.");
  }
} finally {
  setIsSubmitting(false);
}

}

function handleAccountTypeChange(event) {
setAccountType(event.target.value);
setPassword("");
setError("");
}

return ( <main className="login-page"> <section className="login-card"> <div className="login-brand"> <div className="login-brand-mark">S</div>

      <div>
        <h1>ShopFlow</h1>
        <p>Management Platform</p>
      </div>
    </div>

    <div className="login-heading">
      <p className="login-eyebrow">
        {accountType === "admin"
          ? "ADMINISTRATOR WORKSPACE"
          : "CUSTOMER WORKSPACE"}
      </p>

      <h2>Welcome back</h2>

      <p>
        {accountType === "admin"
          ? "Sign in to manage your products, inventory, and categories."
          : "Sign in to explore products and manage your orders."}
      </p>
    </div>

    <form onSubmit={handleSubmit}>
      <div className="login-field">
        <label htmlFor="accountType">Account type</label>

        <select
          id="accountType"
          value={accountType}
          onChange={handleAccountTypeChange}
          disabled={isSubmitting}
        >
          <option value="customer">Customer</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      <div className="login-field">
        <label htmlFor="email">Email address</label>

        <input
          id="email"
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="login-field">
        <label htmlFor="password">Password</label>

        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="login-error" role="alert">
          {error}
        </div>
      )}

      <button
        className="login-button"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>

    {accountType === "customer" && onShowRegister && (
      <p className="login-register">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onShowRegister}
          disabled={isSubmitting}
        >
          Create an account
        </button>
      </p>
    )}

    <p className="login-footer">
      Secure access to your ShopFlow workspace.
    </p>

    {onBackToWelcome && (
      <button
        type="button"
        className="login-back-button"
        onClick={onBackToWelcome}
        disabled={isSubmitting}
      >
        Back to welcome page
      </button>
    )}
  </section>
</main>

);
}

export default Login;
