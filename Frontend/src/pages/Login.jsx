// The staff Login page. A coordinator/nurse/admin types their email + password,
// we POST them to /auth/login, and on success we get back a JWT token. We hand
// that token up to App (via the onLoggedIn callback) so the rest of the app can
// use it. Patients never see this page — they use the public application form.

import { useState } from "react";
import { login } from "../api.js";

// `onLoggedIn` is a function App passes in. We call it with the token once login
// succeeds, so App can save it and switch to the logged-in view.
function Login({ onLoggedIn }) {
  // --- The two form fields. ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- UI feedback: null | "sending" | "error". ---
  const [status, setStatus] = useState(null);

  // Runs when the form is submitted (Enter key or the Log in button).
  async function handleSubmit(event) {
    event.preventDefault(); // don't let the browser reload the page
    setStatus("sending");

    try {
      // login() sends the form-encoded request and returns the token string.
      const token = await login(email, password);
      // Hand the token to App. App stores it and re-renders into the staff view.
      onLoggedIn(token);
      // (No need to reset status — this component unmounts once App switches view.)
    } catch (err) {
      // Wrong credentials (401) or a server problem both land here. We log the
      // real reason for debugging but show the user one friendly message.
      console.error("Login failed:", err);
      setStatus("error");
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "2rem auto", fontFamily: "sans-serif" }}>
      <h1>Staff login</h1>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "1rem" }}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            Password
            {/* type="password" hides the characters as they're typed. */}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ display: "block", width: "100%" }}
            />
          </label>
        </div>

        {/* Disabled while the request is in flight, so you can't submit twice. */}
        <button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Logging in…" : "Log in"}
        </button>
      </form>

      {/* We deliberately DON'T say whether it was the email or the password that
          was wrong — the backend keeps that ambiguous on purpose, and so do we. */}
      {status === "error" && (
        <p style={{ color: "red" }}>Incorrect email or password.</p>
      )}
    </div>
  );
}

export default Login;
