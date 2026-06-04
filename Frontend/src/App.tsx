// The app's route table. This REPLACES the old App.jsx, which manually switched
// between a "patient" and "staff" view with two buttons and a token ternary. Now the
// URL decides the screen, and React Router renders the match.
//
// The routes:
//   /          → the public patient application form. No login, and crucially NO
//                "Staff" link — a patient must never be nudged toward the staff area.
//                Staff reach their login by navigating to /login directly.
//   /login     → ONE shared login page for every staff role (coordinator, nurse, admin).
//                The account's role (from the DB, verified server-side) decides which
//                dashboard they see after login, not which URL they used.
//   /dashboard → the staff workspace, gated by <ProtectedRoute>. StaffHome reads the
//                logged-in user's role and shows the right dashboard(s).
//   *          → anything else falls back to the public form.

import { Routes, Route, Navigate } from "react-router-dom";
import PatientForm from "./pages/PatientForm.jsx";
import Login from "./pages/Login.jsx";
import StaffHome from "./pages/StaffHome.jsx";
import ProtectedRoute from "./routes/ProtectedRoute";

function App() {
  return (
    <Routes>
      {/* Public patient funnel — the default landing screen. */}
      <Route path="/" element={<PatientForm />} />

      {/* Single staff login. */}
      <Route path="/login" element={<Login />} />

      {/* Staff workspace, only reachable once logged in. */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <StaffHome />
          </ProtectedRoute>
        }
      />

      {/* Unknown URL → back to the public form. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
