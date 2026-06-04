// App is the top-level component. It decides WHICH page to show. We keep this
// deliberately simple — a tiny state-based switch — instead of pulling in a
// router library, to match the rest of the project (no extra dependencies yet).
//
// Two areas exist:
//   - "patient": the public application form (no login).
//   - "staff":   the login page, or — once a token exists — the staff home.

import { useState } from "react";
import PatientForm from "./pages/PatientForm.jsx";
import Login from "./pages/Login.jsx";
import StaffHome from "./pages/StaffHome.jsx";
// getToken reads any token saved from a previous visit (survives a page refresh);
// saveToken/clearToken are how we log in and out.
import { getToken, saveToken, clearToken } from "./api";

function App() {
  // Which area is on screen: "patient" (default, public) or "staff".
  const [view, setView] = useState("patient");

  // The current login token. We seed it from localStorage so a refresh keeps you
  // logged in. null = nobody is logged in.
  const [token, setToken] = useState(getToken());

  // Called by Login on success: persist the token and keep it in state.
  function handleLoggedIn(newToken) {
    saveToken(newToken);
    setToken(newToken);
  }

  // Called by StaffHome's "Log out": forget the token everywhere.
  function handleLogout() {
    clearToken();
    setToken(null);
  }

  return (
    <div>
      {/* A tiny nav so you can move between the public form and the staff area.
          Real apps use a router for this; a couple of buttons is enough for now. */}
      <nav style={{ padding: "1rem", fontFamily: "sans-serif" }}>
        <button type="button" onClick={() => setView("patient")}>
          Patient application
        </button>{" "}
        <button type="button" onClick={() => setView("staff")}>
          Staff
        </button>
      </nav>

      {/* Public side. */}
      {view === "patient" && <PatientForm />}

      {/* Staff side: no token → show Login; token present → show StaffHome. */}
      {view === "staff" &&
        (token ? (
          <StaffHome token={token} onLogout={handleLogout} />
        ) : (
          <Login onLoggedIn={handleLoggedIn} />
        ))}
    </div>
  );
}

// Export so main.jsx can import and render it.
export default App;
