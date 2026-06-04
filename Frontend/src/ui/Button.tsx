// A single reusable Button. Every screen imports THIS instead of hand-writing a
// <button> with one-off inline styles, so all buttons share the same look and the
// design tokens (teal primary, 8px radius) live in one place. As we port each
// screen to the mockup, we swap its raw <button>s for this component.
//
// It's a thin wrapper: it forwards every normal button prop (onClick, type,
// disabled, ...) through to the real <button>, and just adds Tailwind classes for
// the chosen `variant`. That means it behaves exactly like a <button> you already
// know — it only adds styling.

import type { ButtonHTMLAttributes } from "react";

// The visual styles a button can take. "primary" is the filled teal call-to-action;
// "secondary" is an outlined/quieter button; "danger" is for destructive actions
// (reject, disable an account) so they read red.
type ButtonVariant = "primary" | "secondary" | "danger";

// Our props = all the native <button> attributes, PLUS our own `variant`. Extending
// the native type is what lets callers pass onClick/disabled/type without us listing
// them one by one.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// The Tailwind classes for each variant. Keyed by variant so the JSX below stays a
// simple lookup. `disabled:` utilities dim the button and block the cursor when the
// native `disabled` prop is set (e.g. while a request is in flight).
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-container focus-visible:ring-primary",
  secondary:
    "bg-surface-container-low text-on-surface border border-outline-variant hover:bg-surface-container focus-visible:ring-outline",
  danger:
    "bg-error text-on-error hover:opacity-90 focus-visible:ring-error",
};

// Classes shared by every variant: spacing, the 8px `rounded-card` radius from the
// design system, a clear keyboard focus ring, and the disabled dimming.
const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-card px-4 py-2 " +
  "text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

function Button({
  variant = "primary",
  // We allow callers to add their own classes (e.g. `w-full`); they come AFTER ours
  // so they can override. Default to "" so the join below never prints "undefined".
  className = "",
  // type defaults to "button" so a button inside a <form> doesn't accidentally
  // submit it — callers pass type="submit" explicitly when they want that.
  type = "button",
  // `...rest` is every other native prop (onClick, disabled, children, ...). We
  // spread it straight onto the real <button>.
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    />
  );
}

export default Button;
