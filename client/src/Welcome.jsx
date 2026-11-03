import { useState } from "react";
import "./Welcome.css";

function Welcome({ onContinue }) {
  const [accountType, setAccountType] = useState("customer");

  function handleContinue() {
    onContinue(accountType);
  }

  return (
    <main className="welcome-page">
      <section className="welcome-container">

        <div className="welcome-brand">
          <div className="welcome-brand-mark">S</div>

          <div>
            <h1>ShopFlow</h1>
            <p>Management Platform</p>
          </div>
        </div>

        <div className="welcome-icon">🛍️</div>

        <div className="welcome-heading">
          <p className="welcome-eyebrow">WELCOME TO SHOPFLOW</p>

          <h2>Your experience starts here.</h2>

          <p>
            Your shopping and management experience,
            all in one place.
          </p>
        </div>

        <div className="welcome-form">

          <label htmlFor="accountType">
            Select Account Type
          </label>

          <select
            id="accountType"
            value={accountType}
            onChange={(event) => setAccountType(event.target.value)}
          >
            <option value="customer">Customer</option>
            <option value="admin">Administrator</option>
          </select>

          <button
            type="button"
            className="welcome-continue-button"
            onClick={handleContinue}
          >
            Continue
            <span>→</span>
          </button>

        </div>

        <footer className="welcome-footer">
          ShopFlow · Smart E-commerce Management
        </footer>

      </section>
    </main>
  );
}

export default Welcome;