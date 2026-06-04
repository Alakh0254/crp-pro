// The staff Login page (route: /login). A coordinator/nurse/admin types their email
// + password, we POST them to /auth/login, and on success we get back a JWT token.
// We hand that token to the AuthContext (which stores it and fetches /auth/me), then
// navigate to /dashboard. Patients never see this page — they use the public form.

import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { login as loginRequest } from "../api";
import { useAuth } from "../auth/AuthContext";

function Login() {
  // From the AuthContext: `login` saves the token (and triggers the user fetch);
  // `token` lets us bounce an already-logged-in user away from the login page.
  const { login, token } = useAuth();
  // useNavigate gives us a function to change the URL after a successful login.
  const navigate = useNavigate();

  // --- The two form fields. ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // --- UI feedback: null | "sending" | "error". ---
  const [status, setStatus] = useState(null);

  // Already logged in? Don't show the login form again — go to the dashboard. This
  // sits AFTER the hooks above so React always calls the same hooks in the same
  // order (the Rules of Hooks); an early return before them would break that.
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  // Runs when the form is submitted (Enter key or the Log in button).
  async function handleSubmit(event) {
    event.preventDefault(); // don't let the browser reload the page
    setStatus("sending");

    try {
      // loginRequest() sends the form-encoded request and returns the token string.
      const newToken = await loginRequest(email, password);
      // Hand the token to the AuthContext: it stores it and fetches the user. Then
      // move to the staff dashboard.
      login(newToken);
      navigate("/dashboard");
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
