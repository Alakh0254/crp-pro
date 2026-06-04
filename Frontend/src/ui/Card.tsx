// A plain content card: a white surface with the design system's rounded corners
// and soft "Level 1" shadow. The dashboards show lots of boxes (one per application,
// referral, trial); wrapping each in <Card> gives them a consistent container
// without repeating the same border/shadow/padding classes everywhere.

import type { HTMLAttributes } from "react";

// All the native <div> props, so a caller can still pass onClick, id, etc.
type CardProps = HTMLAttributes<HTMLDivElement>;

// `bg-surface-container-lowest` is the design system's pure-white card surface;
// `shadow-card` and `rounded-card` are the Level-1 elevation + 8px radius tokens
// we defined in tailwind.config.js.
const BASE_CLASSES =
  "bg-surface-container-lowest rounded-card shadow-card p-6";

function Card({ className = "", ...rest }: CardProps) {
  // Caller classes come last so they can override (e.g. a custom padding).
  return <div className={`${BASE_CLASSES} ${className}`} {...rest} />;
}

export default Card;
