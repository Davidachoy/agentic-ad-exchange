import type { JSX } from "react";
import { NavLink } from "react-router-dom";

const FLOOR_ALERTS = 1;
const DRAFT_DEALS = 2;

function NavRow({
  label,
  badge,
}: {
  label: string;
  badge?: number;
}): JSX.Element {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-2 text-left text-[12.5px] font-medium text-[oklch(0.5_0.01_80)] disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[oklch(0.78_0.005_80)]" aria-hidden />
        {label}
      </span>
      {badge != null && badge > 0 ? (
        <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 font-atlas-mono text-[9px] font-bold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function SellerSidebarNav(): JSX.Element {
  return (
    <>
      <nav className="flex flex-col gap-0.5 p-3" aria-label="Publisher workspace">
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
        <NavRow label="Revenue" />
        <NavRow label="Floors" badge={FLOOR_ALERTS} />
        <NavRow label="Deals" badge={DRAFT_DEALS} />
        <NavRow label="Buyers" />
        <NavRow label="Settlement" />
      </nav>
      <div className="mt-2 border-t border-[oklch(0.94_0.004_80)] px-3 py-3">
        <div className="rounded-lg border border-[oklch(0.91_0.005_80)] bg-white/60 px-3 py-2.5 shadow-sm">
          <div className="text-[12px] font-semibold text-[oklch(0.22_0.01_80)]">Meridian</div>
          <div className="mt-0.5 truncate font-atlas-mono text-[10.5px] text-[oklch(0.5_0.01_80)]">meridiandaily.com</div>
        </div>
      </div>
      <div className="flex min-h-0 flex-1" aria-hidden />
    </>
  );
}
