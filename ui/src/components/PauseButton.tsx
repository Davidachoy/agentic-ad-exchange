export interface PauseButtonProps {
  paused: boolean;
  pending: boolean;
  onPause: () => void;
  onResume: () => void;
}

export function PauseButton({
  paused,
  pending,
  onPause,
  onResume,
}: PauseButtonProps): JSX.Element {
  const handleClick = (): void => {
    if (pending) return;
    if (paused) onResume();
    else onPause();
  };

  const label = pending
    ? paused
      ? "Resuming…"
      : "Pausing…"
    : paused
      ? "▶ Resume Demo"
      : "⏸ Pause Demo";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        paused
          ? "border-emerald-700/60 bg-emerald-900/30 text-emerald-200 hover:bg-emerald-900/50"
          : "border-amber-700/60 bg-amber-900/30 text-amber-200 hover:bg-amber-900/50"
      }`}
      aria-pressed={paused}
      aria-label={paused ? "Resume demo" : "Pause demo"}
    >
      {label}
    </button>
  );
}
