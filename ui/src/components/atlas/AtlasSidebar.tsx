import type { JSX } from "react";
import { NavLink, useLocation } from "react-router-dom";

const PLACEHOLDER_CONTEXT_ACTIONS = [
  "Listings",
  "Bids",
  "Latest auction",
  "Settlements",
  "Demo pause state",
] as const;

export function AtlasSidebar(): JSX.Element {
  const { pathname } = useLocation();
  return (
    <aside className="flex min-h-0 w-60 shrink-0 flex-col border-r border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] font-atlas">
      <div className="flex items-center gap-2 border-b border-[oklch(0.94_0.004_80)] px-4 py-4">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-md bg-[oklch(0.18_0.01_80)] font-atlas-mono text-[10px] font-bold text-white">
          ADE
        </div>
        <div>
          <div className="text-sm font-semibold text-[oklch(0.18_0.01_80)]">Agentic Exchange</div>
          <div className="font-atlas-mono text-[10.5px] text-[oklch(0.55_0.006_80)]">Arc · USDC</div>
        </div>
      </div>
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
          to="/atlas"
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
            className={`h-1.5 w-1.5 rounded-full ${pathname === "/atlas" ? "bg-[#53d2dc]" : "bg-[oklch(0.72_0.006_80)]"}`}
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
      <div className="mt-auto border-t border-[oklch(0.94_0.004_80)] p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[oklch(0.86_0.02_80)] text-[11px] font-semibold text-[oklch(0.36_0.01_80)]">
            U
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-medium text-[oklch(0.22_0.01_80)]">Operator</div>
            <div className="truncate font-atlas-mono text-[10.5px] text-[oklch(0.55_0.006_80)]">demo session</div>
          </div>
          <span className="ml-auto h-2 w-2 rounded-full bg-[#53d2dc] shadow-[0_0_0_3px_rgba(83,210,220,0.25)]" title="connected" />
        </div>
      </div>
    </aside>
  );
}
