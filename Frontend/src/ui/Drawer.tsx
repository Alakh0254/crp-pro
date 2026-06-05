// A right-side slide-in panel for record detail (UI_SPEC §10: "record detail =
// right-side drawer"). The coordinator's lead inbox opens one of these on a row
// click; it's the only place the per-patient actions appear.
//
// Built as a plain fixed <div> (no React portal): a full-screen overlay holds a
// scrim that dims + closes the page behind it, plus a panel pinned to the right
// edge. When `open` is false it renders nothing, so it costs nothing while closed.

import { useEffect } from "react";
import type { ReactNode } from "react";

interface DrawerProps {
  // Whether the panel is shown. False → renders null.
  open: boolean;
  // Called when the user dismisses the drawer (scrim click, close button, or Escape).
  onClose: () => void;
  // Optional heading shown in the drawer's top bar.
  title?: ReactNode;
  // The drawer body.
  children: ReactNode;
}

function Drawer({ open, onClose, title, children }: DrawerProps) {
  // Close on Escape while open — the expected keyboard behaviour for an overlay. The
  // listener is added only while open and torn down on close/unmount.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim: dims the page and closes the drawer when clicked. */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* The panel, pinned to the right. `relative` lifts it above the scrim. */}
      <aside
        role="dialog"
        aria-modal="true"
        className="relative flex h-full w-full max-w-md flex-col overflow-y-auto bg-surface-container-lowest shadow-card"
      >
        <header className="flex items-start justify-between gap-3 border-b border-outline-variant p-6">
          <div className="text-on-surface">{title}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-card px-2 py-1 text-on-surface-variant transition-colors hover:bg-surface-container focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            ✕
          </button>
        </header>

        <div className="p-6">{children}</div>
      </aside>
    </div>
  );
}

export default Drawer;
