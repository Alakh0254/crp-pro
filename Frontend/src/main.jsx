// The entry point of the React app. This file does ONE job: take our top-level
// <App /> component and render it into the <div id="root"> in index.html.
import React from "react";
// createRoot is React 18's way to start ("mount") an app onto a DOM node.
import ReactDOM from "react-dom/client";
// Our top-level component — the thing that decides what page to show.
import App from "./App.jsx";

// 1. Find the empty <div id="root"> in index.html.
// 2. Create a React "root" attached to it.
// 3. Render <App /> inside. StrictMode adds extra dev-only checks/warnings.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
