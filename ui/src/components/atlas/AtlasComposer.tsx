import type { JSX } from "react";
import { useCallback, useState } from "react";

const MAX = 4000;

export interface AtlasComposerProps {
  disabled?: boolean;
  /** When true, shows Cancel to abort the in-flight assistant request. */
  pending?: boolean;
  onCancel?: () => void;
  onSend: (text: string) => void;
}

export function AtlasComposer({ disabled, pending, onCancel, onSend }: AtlasComposerProps): JSX.Element {
  const [text, setText] = useState("");
  const [showEmptyHint, setShowEmptyHint] = useState(false);
  const [showCtx, setShowCtx] = useState(true);

  const send = useCallback(() => {
    const t = text.trim();
    if (!t) {
      setShowEmptyHint(true);
      return;
    }
    setShowEmptyHint(false);
    onSend(t);
    setText("");
  }, [onSend, text]);

  return (
    <div className="border-t border-[oklch(0.91_0.005_80)] bg-gradient-to-t from-[oklch(0.98_0.004_80)] to-transparent px-6 pb-6 pt-3.5 font-atlas">
      <div className="mx-auto max-w-2xl">
        <div
          className={`rounded-2xl border bg-white p-3 shadow-md ${
            showEmptyHint ? "border-amber-400 ring-2 ring-amber-100" : "border-[oklch(0.91_0.005_80)]"
          }`}
        >
          <div className="flex flex-col gap-2.5">
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value.slice(0, MAX));
                setShowEmptyHint(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={disabled}
              rows={1}
              placeholder="Ask about auctions, bids, settlements, or what to do next…"
              className="max-h-40 min-h-[2.75rem] w-full resize-none border-0 bg-transparent py-1 text-sm leading-relaxed text-[oklch(0.18_0.01_80)] outline-none placeholder:text-[oklch(0.62_0.006_80)] disabled:opacity-50"
              aria-label="Message to Atlas"
            />
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {showCtx && (
                  <button
                    type="button"
                    disabled={pending}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] px-2.5 py-1 font-atlas-mono text-[11px] text-[oklch(0.36_0.01_80)] disabled:opacity-40"
                    onClick={() => setShowCtx(false)}
                  >
                    Direct Atlas
                    <span className="text-[oklch(0.62_0.006_80)]" aria-hidden>
                      ×
                    </span>
                  </button>
                )}
                <span className="font-atlas-mono text-[11px] text-[oklch(0.55_0.006_80)]">
                  {text.length}/{MAX}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {pending && onCancel ? (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-lg border border-[oklch(0.88_0.006_80)] bg-[oklch(0.99_0.003_80)] px-3 py-1.5 text-[12px] font-medium text-[oklch(0.32_0.01_80)] hover:bg-[oklch(0.96_0.004_80)]"
                    aria-label="Cancel assistant reply"
                  >
                    Cancel
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={send}
                  disabled={disabled}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[oklch(0.18_0.01_80)] text-white shadow-sm hover:bg-[oklch(0.24_0.012_80)] disabled:opacity-40"
                  aria-label="Send message"
                >
                  <span className="text-[15px] leading-none" aria-hidden>
                    ↑
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
        {showEmptyHint && (
          <p className="mt-2 text-center text-xs text-amber-800" role="alert">
            Enter a message before sending.
          </p>
        )}
        <p className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 font-atlas-mono text-[10.5px] text-[oklch(0.55_0.006_80)]">
          <span>Enter send · Shift+Enter newline{pending ? " · Cancel stops the reply" : ""}</span>
          <span>Context from live exchange feed</span>
        </p>
      </div>
    </div>
  );
}
