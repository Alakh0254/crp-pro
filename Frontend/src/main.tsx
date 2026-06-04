// The entry point of the React app. Its job: mount <App /> into <div id="root"> and
// wrap it in the three providers the whole app relies on. (This file was main.jsx;
// it's now TypeScript like api.ts. index.html points at this file.)
//
// The providers, outermost-in:
//   1. QueryClientProvider — TanStack Query: caches server data and tracks
//      loading/error for any useQuery/useMutation. AuthContext uses it for /auth/me,
//      and the dashboards will migrate their hand-rolled fetches onto it next.
//   2. BrowserRouter — React Router: turns URLs (/, /login, /dashboard) into screens.
//      Replaces the old two-button view-switch in App.jsx.
//   3. AuthProvider — our login state (token + current user). It sits INSIDE
//      QueryClientProvider because it fetches the user with a query, and inside the
//      router so it (and ProtectedRoute) can use navigation.
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
// Self-hosted fonts, bundled by Vite (no Google Fonts CDN request). Inter is the UI
// typeface (weights 400/500/600/700); Material Symbols supplies the dashboard icons
// (its .material-symbols-outlined helper class lives in index.css).
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/material-symbols-outlined/400.css";
// The global stylesheet (Tailwind + our base defaults). Importing it here is how
// Vite knows to bundle it; it loads before <App /> renders.
import "./index.css";

// One QueryClient for the whole app. Created once, here, and handed to the provider.
const queryClient = new QueryClient();

// 1. Find <div id="root">. 2. Create a React root on it. 3. Render the provider
// stack with <App /> at the center. StrictMode adds dev-only checks/warnings.
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
