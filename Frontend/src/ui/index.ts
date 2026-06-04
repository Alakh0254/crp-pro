// The "barrel" file for the shared UI library. It re-exports every component so the
// rest of the app can write one tidy import:
//
//   import { Button, Card, StatusBadge, Spinner } from "../ui";
//
// instead of a separate line per file. As we add more shared components (inputs,
// modals, the dashboard layout shell), they get one export line here.

export { default as Button } from "./Button";
export { default as Card } from "./Card";
export { default as StatusBadge } from "./StatusBadge";
export { default as Spinner } from "./Spinner";
