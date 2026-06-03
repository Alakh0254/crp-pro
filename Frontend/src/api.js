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


// --- Coordinator flow: review + refer (Phase 4) ---------------------------
//
// All three calls below hit PROTECTED routes, so each sends the JWT as
// "Authorization: Bearer <token>". Unlike login (which posts a FORM body), these
// send/receive JSON, so they set Content-Type: application/json where there's a body.

// List every application for the coordinator's review table. Hits GET /applications
// (coordinator/admin only). Returns an array of ApplicationRead objects, each with
// its nested eligibility answers.
export async function listApplications(token) {
  const response = await fetch(`${API_URL}/applications`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Could not load applications (${response.status})`);
  }

  return response.json();
}


// Move an application along the workflow by setting its status. Hits
// PATCH /applications/{id}. `status` must be one of "reviewed" | "approved" |
// "rejected" (the backend's Literal rejects anything else with a 422). Returns the
// updated ApplicationRead.
export async function updateApplicationStatus(token, id, status) {
  const response = await fetch(`${API_URL}/applications/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Could not update application (${response.status})`);
  }

  return response.json();
}


// Refer an APPROVED application to a hospital. Hits POST /referrals. We send only
// application_id + hospital — the backend stamps "referred_by" from the logged-in
// user itself, so the client can't forge who referred. Returns a ReferralRead.
// Note: the backend returns 400 if the application isn't approved yet.
export async function createReferral(token, { application_id, hospital }) {
  const response = await fetch(`${API_URL}/referrals`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ application_id, hospital }),
  });

  if (!response.ok) {
    throw new Error(`Could not create referral (${response.status})`);
  }

  return response.json();
}


// --- Nurse flow: follow-up + trials (Phase 5) ------------------------------
//
// Same shape as the coordinator calls: every one hits a PROTECTED route, so each
// sends the JWT as "Authorization: Bearer <token>". The backend's role guard
// allows only nurse/admin here, so a coordinator's token gets a 403.

// List referred patients for the nurse to follow up on. Hits GET /referrals.
// Returns an array of ReferralDetailRead objects — each referral has its full
// patient `application` (name, contact, eligibility answers) nested inside it.
export async function listReferrals(token) {
  const response = await fetch(`${API_URL}/referrals`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Could not load referrals (${response.status})`);
  }

  return response.json();
}


// Record follow-up by moving a referral along its lifecycle. Hits
// PATCH /referrals/{id}. `status` must be one of "contacted" | "enrolled" |
// "declined" (the backend's Literal rejects anything else with a 422). Returns
// the updated ReferralRead.
export async function updateReferralStatus(token, id, status) {
  const response = await fetch(`${API_URL}/referrals/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Could not update referral (${response.status})`);
  }

  return response.json();
}


// Create a clinical trial. Hits POST /trials. We send only title + description —
// the backend stamps "created_by" from the logged-in user and defaults the status
// to "draft". Returns a TrialRead.
export async function createTrial(token, { title, description }) {
  const response = await fetch(`${API_URL}/trials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, description }),
  });

  if (!response.ok) {
    throw new Error(`Could not create trial (${response.status})`);
  }

  return response.json();
}


// List every trial (newest first). Hits GET /trials. Returns an array of
// TrialRead objects. The nurse dashboard shows this so a freshly created trial
// appears in the list.
export async function listTrials(token) {
  const response = await fetch(`${API_URL}/trials`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Could not load trials (${response.status})`);
  }

  return response.json();
}


// --- Admin flow: manage accounts + launch trials (Phase 6) -----------------
//
// Every call here hits an admin-only route, so each sends the JWT as
// "Authorization: Bearer <token>". The backend's role guard returns 403 for any
// non-admin token, so these only work from the admin dashboard.

// List every staff account for the admin dashboard. Hits GET /users (admin only).
// Returns an array of UserRead objects: { id, name, email, role, is_active }.
// (The password hash is never included — the backend's UserRead omits it.)
export async function listUsers(token) {
  const response = await fetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Could not load users (${response.status})`);
  }

  return response.json();
}


// Create a coordinator/nurse account. Hits POST /users. `role` must be
// "coordinator" or "nurse" (the backend's Literal rejects anything else with a
// 422). Returns the new UserRead. Note: the backend returns 400 if the email is
// already taken.
export async function createUser(token, { name, email, password, role }) {
  const response = await fetch(`${API_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, email, password, role }),
  });

  if (!response.ok) {
    throw new Error(`Could not create user (${response.status})`);
  }

  return response.json();
}


// Enable or disable a staff account. Hits PATCH /users/{id}. Pass is_active=false
// to disable (the backend then refuses that user's logins) or true to re-enable.
// Returns the updated UserRead. Note: the backend returns 400 if an admin tries
// to disable their OWN account (that would lock them out).
export async function updateUserStatus(token, id, isActive) {
  const response = await fetch(`${API_URL}/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ is_active: isActive }),
  });

  if (!response.ok) {
    throw new Error(`Could not update user (${response.status})`);
  }

  return response.json();
}


// Launch (or close) a trial by moving its status. Hits PATCH /trials/{id}.
// `status` must be "open" or "closed" (the backend's Literal rejects anything
// else with a 422). Launching a draft trial means status "open". Returns the
// updated TrialRead.
export async function updateTrialStatus(token, id, status) {
  const response = await fetch(`${API_URL}/trials/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Could not update trial (${response.status})`);
  }

  return response.json();
}
