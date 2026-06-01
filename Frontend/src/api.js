// This module is the ONE place in the frontend that knows how to talk to the
// backend. Every page imports functions from here instead of writing fetch URLs
// by hand. If the backend address ever changes (e.g. when we deploy), we edit
// this single line rather than hunting through every page.

// The base address of the FastAPI server during local development.
const API_URL = "http://localhost:8000";

// Send a new patient application to the backend.
//
// `payload` must match the backend's ApplicationCreate schema exactly:
//   { patient_name, email, contact, trial_id (optional), answers: [{question, answer}] }
// Wrong field names or types → the backend replies 422 (validation error).
//
// `async` means this function returns a Promise; callers use `await` to get the
// result once the network request finishes.
export async function createApplication(payload) {
  // fetch() sends the HTTP request. We await the Response object it resolves to.
  const response = await fetch(`${API_URL}/applications`, {
    // POST = "create a new resource" (our POST /applications route).
    method: "POST",
    // Tell the server the body is JSON so it parses it correctly.
    headers: { "Content-Type": "application/json" },
    // The body must be a JSON *string*, so we stringify our JS object.
    body: JSON.stringify(payload),
  });

  // fetch only rejects on network failure, NOT on HTTP error codes. So we check
  // the status ourselves: anything outside 200–299 means the server refused it.
  if (!response.ok) {
    // Throw so the caller's try/catch can show an error message to the user.
    throw new Error(`Request failed (${response.status})`);
  }

  // Parse the JSON response body (an ApplicationRead object) and hand it back.
  return response.json();
}


// --- Auth: login + the token helpers --------------------------------------
//
// Logging in returns a JWT (a long signed string). We keep that token and send
// it back on every protected request as "Authorization: Bearer <token>" so the
// backend knows who we are. We store it in the browser's localStorage so a page
// refresh doesn't log the user out.

// The single key we store the token under. Using one named constant means we
// can never misspell it in one place and not another.
const TOKEN_KEY = "crp_token";

// Save / read / remove the token. These three tiny wrappers are the ONLY code
// that touches localStorage, so the rest of the app never deals with it directly.
export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken() {
  // Returns the saved token, or null if nobody is logged in.
  return localStorage.getItem(TOKEN_KEY);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}


// Log a staff member in. On success the backend returns { access_token, token_type };
// we return the raw access_token string for the caller to store.
//
// IMPORTANT: the backend's login route uses OAuth2PasswordRequestForm, which
// expects FORM fields (application/x-www-form-urlencoded), NOT JSON — and the
// email goes in a field literally named "username". This is the standard OAuth2
// shape, and it's a common thing to get wrong, so note it well.
export async function login(email, password) {
  // URLSearchParams builds a form-encoded body ("username=...&password=...")
  // and fetch sets the right Content-Type header for it automatically.
  const body = new URLSearchParams();
  body.append("username", email); // the backend treats username as the email
  body.append("password", password);

  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    body,
  });

  // 401 = wrong email/password. Anything else non-2xx is some other failure.
  if (!response.ok) {
    throw new Error(`Login failed (${response.status})`);
  }

  // { access_token, token_type } — we only need the token itself.
  const data = await response.json();
  return data.access_token;
}


// Ask the backend "who am I?" using the stored token. This proves the token works:
// it hits the protected GET /auth/me route, which 401s without a valid token.
// Returns a UserRead object: { id, name, email, role, is_active }.
export async function getCurrentUser(token) {
  const response = await fetch(`${API_URL}/auth/me`, {
    // This is how we present the token on a protected route.
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    // Token missing/expired/invalid → the caller should send the user back to login.
    throw new Error(`Could not load current user (${response.status})`);
  }

  return response.json();
}
