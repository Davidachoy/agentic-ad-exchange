import type { JSX } from "react";
import { NavLink, useLocation } from "react-router-dom";

const PLACEHOLDER_CONTEXT_ACTIONS = [
  "Listings",
  "Bids",
  "Latest auction",
  "Settlements",
  "Demo pause state",
] as const;

export function BuyerSidebarNav(): JSX.Element {
  const { pathname } = useLocation();
  const atlasActive = pathname === "/buyer" || pathname === "/atlas";

  return (
    <>
      <nav className="flex flex-col gap-0.5 p-3" aria-label="Workspace">
        <NavLink
          to="/"
          className={({ isActive }) =>
            [
              "flex items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] font-medium",
              isActive
                ? "border border-[oklch(0.94_0.004_80)] bg-white text-[oklch(0.18_0.01_80)] shadow-sm"
                : "text-[oklch(0.4_0.01_80)] hover:bg-[oklch(0.94_0.005_80)]",
            ].join(" ")
          }
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[oklch(0.72_0.006_80)]" />
          Exchange
        </NavLink>
        <NavLink
          to="/buyer"
          className={({ isActive }) =>
            [
              "flex items-center gap-2 rounded-lg px-2 py-2 text-[12.5px] font-medium",
              isActive
                ? "border border-[oklch(0.94_0.004_80)] bg-white text-[oklch(0.18_0.01_80)] shadow-sm"
                : "text-[oklch(0.4_0.01_80)] hover:bg-[oklch(0.94_0.005_80)]",
            ].join(" ")
          }
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${atlasActive ? "bg-[#53d2dc]" : "bg-[oklch(0.72_0.006_80)]"}`}
          />
          Atlas
        </NavLink>
      </nav>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-2 pt-1">
        <div className="flex items-baseline justify-between px-1">
          <span className="font-atlas-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[oklch(0.55_0.006_80)]">
            Topics
          </span>
          <span className="font-atlas-mono text-[10px] text-[oklch(0.62_0.006_80)]">soon</span>
        </div>
        <ul className="list-none flex flex-col gap-1 p-0" aria-label="Atlas context shortcuts (placeholders)">
          {PLACEHOLDER_CONTEXT_ACTIONS.map((label) => (
            <li key={label}>
              <button
                type="button"
                disabled
                title="Coming soon"
                className="flex w-full items-center gap-2 rounded-lg border border-transparent px-2 py-2 text-left text-[12.5px] font-medium text-[oklch(0.5_0.01_80)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[oklch(0.78_0.005_80)]" aria-hidden />
                {label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
