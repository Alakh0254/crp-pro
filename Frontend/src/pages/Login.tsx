// The staff Login page (route: /login). ONE shared sign-in for every staff role —
// coordinator, nurse, admin. The account's role (from the DB, verified server-side on
// every request) decides which dashboard they land on after login, NOT which URL they
// used; this page is UI only and grants no access. Patients never see it — they use the
// public form at "/".
//
// Flow: type email + password → POST /auth/login → on success we get a JWT, hand it to
// the AuthContext (which stores it and fetches /auth/me), then navigate to /dashboard.
//
// Visual reference: stitch_crp_pro_ui_design_spec/staff_login/code.html, translated onto
// our real design tokens and the shared ui/ components (Card, Button). This file replaces
// the old Login.jsx, which used one-off inline styles.

import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { login as loginRequest } from "../api";
import { useAuth } from "../auth/AuthContext";
import { Button, Card } from "../ui";

// Input + label styling, the same idiom PatientForm uses, so every text field in the
// app reads identically (8px radius, teal focus ring, muted placeholder).
const INPUT_CLASSES =
  "w-full rounded-card border border-outline px-4 py-2.5 text-sm outline-none " +
  "transition-colors placeholder:text-outline-variant " +
  "focus:border-primary focus:ring-1 focus:ring-primary";

const LABEL_CLASSES = "block text-sm font-medium text-on-surface-variant";

function Login() {
  // From the AuthContext: `login` saves the token (and triggers the user fetch);
  // `token` lets us bounce an already-logged-in user away from the login page.
  const { login, token } = useAuth();
  // useNavigate gives us a function to change the URL after a successful login.
  const navigate = useNavigate();

  // --- The two form fields. ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Whether the password is shown as plain text (the eye toggle in the field).
  const [showPassword, setShowPassword] = useState(false);

  // --- UI feedback: null | "sending" | "error". ---
  const [status, setStatus] = useState<"sending" | "error" | null>(null);

  // Already logged in? Don't show the login form again — go to the dashboard. This sits
  // AFTER the hooks above so React always calls the same hooks in the same order (the
  // Rules of Hooks); an early return before them would break that.
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  const isSending = status === "sending";
  // The submit button stays disabled until BOTH fields have content (and while a request
  // is in flight, so you can't submit twice).
  const canSubmit = email.trim() !== "" && password !== "" && !isSending;

  // Runs when the form is submitted (Enter key or the Sign in button).
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); // don't let the browser reload the page
    setStatus("sending");

    try {
      // loginRequest() sends the form-encoded request and returns the token string.
      // Trim the email so a stray leading/trailing space doesn't cause a spurious 401;
      // the password is sent verbatim (spaces can be legitimate password characters).
      const newToken = await loginRequest(email.trim(), password);
      // Hand the token to the AuthContext: it stores it and fetches the user. Then move
      // to the staff dashboard.
      login(newToken);
      navigate("/dashboard");
    } catch (err) {
      // Wrong credentials (401) or a server problem both land here. We log the real
      // reason for debugging but show the user ONE generic message — never revealing
      // whether the account exists or its role (CLAUDE.md domain rule: generic
      // "invalid credentials").
      console.error("Login failed:", err);
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <main className="w-full max-w-[440px]">
        {/* --- Brand identity. --- */}
        <div className="mb-8 flex flex-col items-center">
          <span className="material-symbols-outlined text-[40px] text-primary">
            clinical_notes
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-primary">
            CRP-Pro
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">Staff sign in</p>
        </div>

        {/* --- Login container. --- */}
        <Card>
          {/* Generic error banner. We deliberately DON'T say whether it was the email or
              the password that was wrong, or whether the account exists — the backend
              keeps that ambiguous on purpose, and so do we. */}
          {status === "error" && (
            <div className="mb-6 flex items-center gap-2 rounded-card bg-error-container px-4 py-3 text-on-error-container">
              <span className="material-symbols-outlined text-[20px]">error</span>
              <p className="text-sm font-medium">Invalid email or password</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email field. */}
            <div className="space-y-1.5">
              <label className={LABEL_CLASSES} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="name@clinic.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={INPUT_CLASSES}
              />
            </div>

            {/* Password field, with a show/hide toggle. */}
            <div className="space-y-1.5">
              <label className={LABEL_CLASSES} htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  // The toggle flips this between "password" (dots) and "text" (plain).
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  // Extra right padding so text never sits under the eye button.
                  className={`${INPUT_CLASSES} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-on-surface-variant transition-colors hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Disabled until both fields are filled and while a request is in flight. */}
            <Button type="submit" disabled={!canSubmit} className="w-full">
              {isSending ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>

        {/* --- Footer: send patients to the public funnel, not the staff area. We use
            React Router's <Link> (not a raw <a href>) so it's a client-side route change
            — no full page reload, and the app's providers/cache stay warm. --- */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="group inline-flex items-center justify-center gap-1 text-sm font-medium text-on-surface-variant transition-colors hover:text-primary"
          >
            Patients apply here
            <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* --- Security badge (reassurance only). The copy must stay ACCURATE: traffic is
            TLS-encrypted and PHI is encrypted at rest, but the server DOES decrypt PHI to
            do its job, so this is NOT end-to-end encryption. "Secure connection" reflects
            the real model (TLS) without overclaiming. --- */}
        <div className="mt-8 flex items-center justify-center gap-2 opacity-40">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          <p className="text-xs font-medium uppercase tracking-widest">
            Secure connection
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
