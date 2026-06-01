// Vite's config file. Vite is the dev server + build tool for our React app.
import { defineConfig } from "vite";
// This plugin teaches Vite how to compile React's JSX (the HTML-in-JS syntax).
import react from "@vitejs/plugin-react";

// defineConfig just gives us editor autocomplete; it returns the object as-is.
export default defineConfig({
  // Enable the React plugin. Without it, .jsx files wouldn't compile.
  plugins: [react()],
  server: {
    // Pin the dev server to port 5173 — this is the exact origin we allow-listed
    // in the backend's CORS settings, so the two must match.
    port: 5173,
  },
});
