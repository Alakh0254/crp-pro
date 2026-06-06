/// <reference types="vite/client" />

// Type declarations for the VITE_* environment variables we read through
// `import.meta.env`. Vite ships the base types (import.meta.env, MODE, DEV, ...)
// under "vite/client" referenced above; here we ADD our own keys via declaration
// merging so `import.meta.env.VITE_API_URL` is typed as a string instead of `any`
// — a typo'd variable name then becomes a compile error under `npm run typecheck`.
interface ImportMetaEnv {
  // Base URL of the backend API. Optional: api.ts falls back to localhost:8000
  // when it's unset, so a plain `npm run dev` works with no .env file.
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
