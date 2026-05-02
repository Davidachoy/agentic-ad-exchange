import type { JSX } from "react";
import { useCallback, useState } from "react";

const MAX = 4000;

export interface AtlasComposerProps {
  disabled?: boolean;
  onSend: (text: string) => void;
}

export function AtlasComposer({ disabled, onSend }: AtlasComposerProps): JSX.Element {
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
          className={`rounded-2xl border bg-white p-1 pl-3.5 shadow-md ${
            showEmptyHint ? "border-amber-400 ring-2 ring-amber-100" : "border-[oklch(0.91_0.005_80)]"
          }`}
        >
          <div className="flex items-start gap-2.5 pt-2.5">
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
              rows={2}
              placeholder="Ask about auctions, bids, settlements, or what to do next…"
              className="max-h-40 min-h-[48px] w-full resize-none border-0 bg-transparent text-sm leading-relaxed text-[oklch(0.18_0.01_80)] outline-none placeholder:text-[oklch(0.62_0.006_80)] disabled:opacity-50"
              aria-label="Message to Atlas"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 px-0 pb-1.5 pt-1">
            {showCtx && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-[oklch(0.91_0.005_80)] bg-[oklch(0.97_0.005_80)] px-2.5 py-1 font-atlas-mono text-[11px] text-[oklch(0.36_0.01_80)]"
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
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={send}
                disabled={disabled}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[oklch(0.18_0.01_80)] text-white hover:bg-[oklch(0.24_0.012_80)] disabled:opacity-40"
                aria-label="Send message"
              >
                <span className="text-sm leading-none" aria-hidden>
                  ↑
                </span>
              </button>
            </div>
          </div>
        </div>
        {showEmptyHint && (
          <p className="mt-2 text-center text-xs text-amber-800" role="alert">
            Enter a message before sending.
          </p>
        )}
        <p className="mt-2 flex justify-between font-atlas-mono text-[10.5px] text-[oklch(0.55_0.006_80)]">
          <span>Enter send · Shift+Enter newline</span>
          <span>Context from live exchange feed</span>
        </p>
      </div>
    </div>
  );
}
