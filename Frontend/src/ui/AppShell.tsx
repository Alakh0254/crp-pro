// The staff dashboard's app shell (UI_SPEC §9): a persistent left sidebar + a top bar,
// with the page content rendered in the main area. StaffHome wraps every role's
// dashboard in this so the whole staff app shares one frame. The visual reference is
// stitch_crp_pro_ui_design_spec/staff_dashboard_shell/code.html — we translate its
// markup onto our real design tokens (the mockup's inline Tailwind config defines extra
// utilities like `p-md`/`text-headline-sm` that our tailwind.config.js doesn't, so we
// use standard Tailwind spacing/type classes plus our color/radius/shadow tokens).
//
// Role-based nav: the sidebar items come from UI_SPEC §4/§5/§6 per role. There are no
// per-item sub-routes yet (the whole dashboard lives at /dashboard), so these items are
// presentational for now — the first is marked active. They become real <NavLink>s when
// the dashboard is split into sub-pages in a later batch.

import type { ReactNode } from "react";
import Button from "./Button";

// One sidebar entry: a Material Symbols icon name + its label.
interface NavItem {
  icon: string;
  label: string;
}

// The nav items each role sees, taken from UI_SPEC §4 (coordinator), §5 (nurse), and
// §6 (admin). Admin oversees everything, so it gets the widest set.
const NAV_BY_ROLE: Record<string, NavItem[]> = {
  coordinator: [
    { icon: "description", label: "Leads" },
    { icon: "group", label: "My Referrals" },
    { icon: "biotech", label: "Trials" },
    { icon: "person", label: "Profile" },
  ],
  nurse: [
    { icon: "group", label: "Referred Patients" },
    { icon: "biotech", label: "Trials" },
    { icon: "add_circle", label: "Create Trial" },
    { icon: "person", label: "Profile" },
  ],
  admin: [
    { icon: "dashboard", label: "Overview" },
    { icon: "manage_accounts", label: "Users" },
    { icon: "biotech", label: "Trials" },
    { icon: "supervisor_account", label: "Coordinators" },
    { icon: "vaccines", label: "Nurses" },
    { icon: "person", label: "Profile" },
  ],
};

interface AppShellProps {
  // The logged-in staff member's display name and role, shown in the top bar. `role`
  // also selects which sidebar nav set to show.
  userName: string;
  role: string;
  // Called when the user clicks Logout (in the sidebar footer or the top bar).
  onLogout: () => void;
  // The page title shown at the left of the top bar.
  title?: string;
  // The dashboard(s) to render in the main content area.
  children: ReactNode;
}

function AppShell({
  userName,
  role,
  onLogout,
  title = "Dashboard",
  children,
}: AppShellProps) {
  // Fall back to an empty nav for an unrecognised role rather than crashing.
  const navItems = NAV_BY_ROLE[role] ?? [];

  // Shared classes for a sidebar nav row (icon + label). The active row uses the
  // secondary-container fill from the mockup; inactive rows are muted and lift on hover.
  const navRowBase =
    "flex items-center gap-3 rounded-card px-3 py-2 text-sm font-medium transition-colors";
  const navRowActive = "bg-secondary-container text-on-secondary-container";
  const navRowInactive =
    "text-on-surface-variant hover:bg-surface-container-high";

  return (
    <div className="flex min-h-screen">
      {/* --- Sidebar: fixed, 280px. Hidden on small screens (a mobile drawer is a
          later concern — UI_SPEC §9); the main column drops its left margin to match. */}
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[280px] flex-col gap-2 border-r border-outline-variant bg-surface-container-low p-4 md:flex">
        {/* Logo / brand block. */}
        <div className="flex flex-col px-2 py-3">
          <span className="text-xl font-semibold text-primary">CRP-Pro</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
            Clinical Excellence
          </span>
        </div>

        {/* Role-based nav. Presentational for now (see file header); the first item is
            marked current via aria-current. */}
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => (
            <div
              key={item.label}
              aria-current={index === 0 ? "page" : undefined}
              className={`${navRowBase} ${
                index === 0 ? navRowActive : navRowInactive
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        {/* Sidebar footer: Logout (the real action). */}
        <button
          type="button"
          onClick={onLogout}
          className={`${navRowBase} ${navRowInactive} w-full text-error hover:bg-error-container/20`}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          <span>Logout</span>
        </button>
      </aside>

      {/* --- Main column: top bar + content. Offset by the sidebar width on md+. */}
      <div className="flex min-w-0 flex-1 flex-col md:ml-[280px]">
        {/* Top bar: page title on the left; user identity + logout on the right. */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-6 shadow-sm">
          <h1 className="text-xl font-semibold text-on-surface">{title}</h1>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end leading-tight">
              <span className="text-sm font-medium text-on-surface">{userName}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
                {role}
              </span>
            </div>
            <Button variant="secondary" onClick={onLogout}>
              Log out
            </Button>
          </div>
        </header>

        {/* The role's dashboard(s) render here. */}
        <main className="flex-1 space-y-6 p-6">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
