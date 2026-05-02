import type { JSX } from "react";
import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  [
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    isActive ? "bg-exchange-accent text-exchange-bg" : "text-slate-300 hover:bg-slate-800 hover:text-white",
  ].join(" ");

export function AppNav(): JSX.Element {
  return (
    <nav aria-label="Primary" className="mb-6 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
      <NavLink to="/" className={linkClass} end>
        Exchange
      </NavLink>
      <NavLink to="/atlas" className={linkClass}>
        Atlas
      </NavLink>
    </nav>
  );
}
