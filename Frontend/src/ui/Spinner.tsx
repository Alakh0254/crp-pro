// A small loading spinner. We show data after a network request, and there's always
// a moment while that request is in flight — this gives every screen the same
// "working…" indicator instead of plain "Loading…" text. ProtectedRoute uses it
// full-screen while it checks who you are.
//
// It's pure CSS: a ring with one transparent side, spun by Tailwind's `animate-spin`.

interface SpinnerProps {
  // Optional label read by screen readers (the spinning ring itself is invisible to
  // them). Defaults to a generic "Loading".
  label?: string;
  // Extra classes for positioning (e.g. centering inside a page).
  className?: string;
}

function Spinner({ label = "Loading", className = "" }: SpinnerProps) {
  return (
    <span
      // role + aria-label announce the loading state to assistive tech.
      role="status"
      aria-label={label}
      className={
        "inline-block h-6 w-6 animate-spin rounded-full border-2 " +
        "border-outline-variant border-t-primary " +
        className
      }
    />
  );
}

export default Spinner;
