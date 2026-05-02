import type { JSX } from "react";

export function AtlasTopBar(): JSX.Element {
  const now = new Date();
  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-[oklch(0.91_0.005_80)] bg-[oklch(0.985_0.004_80)] px-5 font-atlas">
      <div className="flex items-center gap-2 text-[12.5px] text-[oklch(0.4_0.01_80)]">
        <span className="font-semibold text-[oklch(0.18_0.01_80)]">Atlas</span>
        <span className="text-[oklch(0.62_0.006_80)]">/</span>
        <span>Exchange assistant</span>
      </div>
      <div className="ml-auto flex items-center gap-3 font-atlas-mono text-[11.5px] text-[oklch(0.45_0.01_80)]">
        <span className="rounded-full border border-[oklch(0.91_0.005_80)] bg-white px-2 py-0.5">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#53d2dc]" />
          LIVE
        </span>
        <span className="hidden sm:inline">{now.toLocaleDateString()}</span>
      </div>
    </header>
  );
}
