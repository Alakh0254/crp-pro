// The entry point of the React app. This file does ONE job: take our top-level
// <App /> component and render it into the <div id="root"> in index.html.
import React from "react";
// createRoot is React 18's way to start ("mount") an app onto a DOM node.
import ReactDOM from "react-dom/client";
// Our top-level component — the thing that decides what page to show.
import App from "./App.jsx";
// Self-hosted fonts, bundled by Vite (no Google Fonts CDN request). Inter is the UI
// typeface — we load the four weights the design uses (400/500/600/700). Material
// Symbols supplies the dashboard icons; its .material-symbols-outlined helper class
// lives in index.css.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/material-symbols-outlined/400.css";
// Pull in the global stylesheet (Tailwind + our base defaults). Importing CSS here
// is how Vite knows to bundle it; it loads before <App /> renders.
import "./index.css";

// 1. Find the empty <div id="root"> in index.html.
// 2. Create a React "root" attached to it.
// 3. Render <App /> inside. StrictMode adds extra dev-only checks/warnings.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
