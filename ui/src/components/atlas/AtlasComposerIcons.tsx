import type { JSX } from "react";

const icon = "text-current";

function svgProps(size: number): { width: number; height: number; viewBox: string; "aria-hidden": boolean } {
  return { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true };
}

/** Small outline icons for the Atlas composer (no icon library dependency). */
export function IconBolt({ className }: { className?: string }): JSX.Element {
  return (
    <svg {...svgProps(14)} className={`${icon} ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

export function IconTag({ className }: { className?: string }): JSX.Element {
  return (
    <svg {...svgProps(14)} className={`${icon} ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

export function IconClock({ className }: { className?: string }): JSX.Element {
  return (
    <svg {...svgProps(14)} className={`${icon} ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="9" fill="none" />
    </svg>
  );
}

/** Plus control for composer “add mode” menus (Claude-style). */
export function IconPlus({ className }: { className?: string }): JSX.Element {
  return (
    <svg {...svgProps(18)} className={`${icon} ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconPaperclip({ className }: { className?: string }): JSX.Element {
  return (
    <svg {...svgProps(18)} className={`${icon} ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.75">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.2-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"
      />
    </svg>
  );
}

export function IconQuickBolt({ className }: { className?: string }): JSX.Element {
  return (
    <svg {...svgProps(18)} className={`${icon} ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.75">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

/** Claude-style stop control: ring + solid square (generation in flight). */
export function IconStopGeneration({ className }: { className?: string }): JSX.Element {
  return (
    <svg {...svgProps(18)} className={`${icon} ${className ?? ""}`} fill="none" stroke="currentColor" strokeWidth="1.75">
      <circle cx="12" cy="12" r="7.25" fill="none" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
