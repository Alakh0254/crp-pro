// Tailwind's config. This is the SINGLE SOURCE OF TRUTH for our design tokens —
// the exact colors, font, radii, and shadows from the design system in
// stitch_crp_pro_ui_design_spec/clinical_trust_protocol/DESIGN.md. By putting them
// here, every screen can use classes like `bg-primary` or `text-on-surface` and get
// the official "Clinical Trust Protocol" values, instead of hand-typing hex codes.
//
// ESM `export default` because package.json sets "type": "module".
import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  // Which files Tailwind scans for class names. It only generates CSS for classes
  // it actually finds here, which keeps the output tiny. We include index.html and
  // every component file (.jsx today, .tsx after migration).
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // --- Colors: copied verbatim from DESIGN.md's Material-style palette. ---
      // "Medical Teal" is the primary brand color. `on-*` colors are the readable
      // text/icon color to use ON TOP of the matching surface (e.g. on-primary text
      // on a primary background), already contrast-checked in the design system.
      colors: {
        surface: "#faf8ff",
        "surface-dim": "#d2d9f4",
        "surface-bright": "#faf8ff",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f2f3ff",
        "surface-container": "#eaedff",
        "surface-container-high": "#e2e7ff",
        "surface-container-highest": "#dae2fd",
        "on-surface": "#131b2e",
        "on-surface-variant": "#3e494a",
        "inverse-surface": "#283044",
        "inverse-on-surface": "#eef0ff",
        outline: "#6e797a",
        "outline-variant": "#bdc9ca",
        "surface-tint": "#006972",
        primary: "#00626a",
        "on-primary": "#ffffff",
        "primary-container": "#0e7c86",
        "on-primary-container": "#ddfbff",
        "inverse-primary": "#7cd4df",
        secondary: "#0051d5",
        "on-secondary": "#ffffff",
        "secondary-container": "#316bf3",
        "on-secondary-container": "#fefcff",
        tertiary: "#6c23dd",
        "on-tertiary": "#ffffff",
        "tertiary-container": "#8646f7",
        "on-tertiary-container": "#faf2ff",
        error: "#ba1a1a",
        "on-error": "#ffffff",
        "error-container": "#ffdad6",
        "on-error-container": "#93000a",
        background: "#faf8ff",
        "on-background": "#131b2e",
        "surface-variant": "#dae2fd",
      },
      // --- Typography: Inter is the only typeface (DESIGN.md). We register it as
      // both the default sans font and an explicit `font-display`. The web font
      // itself is loaded in index.html; this just tells Tailwind to reference it. ---
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      // --- Shapes: DESIGN.md uses 8px (lg) as the default radius for cards/inputs,
      // 12px (xl) for large containers, and full pills for status badges. Tailwind's
      // built-in scale already matches these; we add `card`/`pill` aliases so screen
      // code reads by intent. ---
      borderRadius: {
        card: "0.5rem", // 8px — cards, inputs, buttons
        pill: "9999px", // status badges, tags
      },
      // --- Elevation: the two ambient shadows from DESIGN.md (Level 1 cards,
      // Level 2 modals/popovers). ---
      boxShadow: {
        card: "0px 4px 12px rgba(15, 23, 42, 0.05)",
        modal: "0px 12px 24px rgba(15, 23, 42, 0.1)",
      },
    },
  },
  // The forms plugin gives inputs/selects a sane styled baseline to build on — the
  // mockups load it too (cdn.tailwindcss.com?plugins=forms).
  plugins: [forms],
};
