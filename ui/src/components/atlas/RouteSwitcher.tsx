import type { JSX } from "react";
import { NavLink, useLocation } from "react-router-dom";

const segmentBase =
  "flex flex-1 items-center justify-center rounded-l-[10px] rounded-r-none py-2 text-center text-xs font-medium transition-[color,background-color,box-shadow] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.78_0.02_80)] focus-visible:ring-offset-2 focus-visible:ring-offset-[oklch(0.99_0.004_80)]";

const segmentRight = "rounded-l-none rounded-r-[10px]";

const segmentActive =
  "bg-white text-[oklch(0.22_0.012_80)] shadow-[0_1px_2px_rgba(15,23,42,0.05)]";

const segmentInactive =
  "bg-transparent text-[oklch(0.58_0.008_80)] hover:text-[oklch(0.40_0.012_80)]";

export function RouteSwitcher(): JSX.Element {
  const { pathname } = useLocation();
  const buyerSegmentActive = pathname === "/buyer" || pathname === "/atlas";

  return (
    <div className="w-full px-3 pb-2 pt-1" role="navigation" aria-label="Assistant role">
      <div className="flex w-full rounded-[10px] border border-[oklch(0.91_0.005_80)] bg-[oklch(0.99_0.004_80)] p-0.5">
        <NavLink
          to="/buyer"
          end
          aria-current={buyerSegmentActive ? "page" : undefined}
          className={() =>
            `${segmentBase} ${buyerSegmentActive ? segmentActive : segmentInactive}`
          }
        >
          Buyer
        </NavLink>
        <NavLink
          to="/seller"
          end
          className={({ isActive }) =>
            `${segmentBase} ${segmentRight} ${isActive ? segmentActive : segmentInactive}`
          }
        >
          Seller
        </NavLink>
      </div>
    </div>
  );
}
