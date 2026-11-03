import { useState } from "react";
import "./Register.css";
import { apiRequest } from "./api";

function Register({ onBackToLogin }) {
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [error, setError] = useState("");
const [notice, setNotice] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);

async function handleSubmit(event) {
event.preventDefault();

setError("");
setNotice("");

if (password !== confirmPassword) {
  setError("Passwords do not match.");
  return;
}

if (password.length < 8) {
  setError("Password must be at least 8 characters long.");
  return;
}

setIsSubmitting(true);

try {
  const result = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: name.trim(),
      email: email.trim(),
      password,
    }),
  });

  setNotice(
    result.message || "Account created successfully. You can now sign in.",
  );

  setName("");
  setEmail("");
  setPassword("");
  setConfirmPassword("");
} catch (err) {
  setError(err.message || "Unable to create your account.");
} finally {
  setIsSubmitting(false);
}

}

return ( <main className="register-page"> <section className="register-card"> <div className="register-brand"> <div className="register-brand-mark">S</div>

      <div>
        <h1>ShopFlow</h1>
        <p>Customer Account</p>
      </div>
    </div>

    <div className="register-heading">
      <p className="register-eyebrow">JOIN SHOPFLOW</p>

      <h2>Create your account</h2>

      <p>
        Register to start exploring products and managing your orders.
      </p>
    </div>

    <form onSubmit={handleSubmit}>
      <div className="register-field">
        <label htmlFor="register-name">Full name</label>

        <input
          id="register-name"
          type="text"
          placeholder="Enter your full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="register-field">
        <label htmlFor="register-email">Email address</label>

        <input
          id="register-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="register-field">
        <label htmlFor="register-password">Password</label>

        <input
          id="register-password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="register-field">
        <label htmlFor="confirm-password">Confirm password</label>

        <input
          id="confirm-password"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
          disabled={isSubmitting}
        />
      </div>

      {error && (
        <div className="register-error" role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className="register-success" role="status">
          {notice}
        </div>
      )}

      <button
        className="register-button"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Creating account..." : "Create Account"}
      </button>
    </form>

    <p className="register-footer">
      Already have an account?{" "}
      <button
        type="button"
        onClick={onBackToLogin}
        disabled={isSubmitting}
      >
        Sign in
      </button>
    </p>
  </section>
</main>

);
}
export default Register;
