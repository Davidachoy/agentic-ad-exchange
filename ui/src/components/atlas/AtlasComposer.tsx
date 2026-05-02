import type { JSX } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import type { AtlasComposerMode } from "../../assistant/atlasComposerSimulation.js";

import { IconBolt, IconClock, IconPaperclip, IconQuickBolt, IconTag } from "./AtlasComposerIcons.js";

export type { AtlasComposerMode } from "../../assistant/atlasComposerSimulation.js";

const MAX = 4000;

/** Matches `.atlas-composer-input textarea` min/max height (≈2 short lines, not a tall block). */
const TEXTAREA_MIN_HEIGHT_PX = 22;
const TEXTAREA_MAX_HEIGHT_PX = 52;

/** Sample instruction inserted by Quick action (demo). */
const QUICK_ACTION_SAMPLE =
  "Bid $5 CPM on Roku CTV for Solstice 1P, $20K daily cap, run through Sunday.";

const PLACEHOLDERS: Record<AtlasComposerMode, string> = {
  direct: "Ask about auctions, bids, settlements, or what to do next...",
  goal: "What should Atlas optimize for? e.g. Maximize VCR for Solstice 1P...",
  policy: "Define a rule for Atlas. e.g. Never bid above $15 CPM on Tubi...",
};

const HINTS: Record<AtlasComposerMode, string> = {
  direct: "Context from live exchange feed",
  goal: "Updates campaign objective",
  policy: "Adds a permanent rule to Atlas",
};

export interface AtlasComposerProps {
  disabled?: boolean;
  /** When true, shows Cancel to abort the in-flight assistant request. */
  pending?: boolean;
  onCancel?: () => void;
  onSend: (text: string, mode: AtlasComposerMode) => void;
}

function fitComposerTextarea(el: HTMLTextAreaElement): void {
  el.style.height = "auto";
  const sh = el.scrollHeight;
  const h = Math.min(Math.max(sh, TEXTAREA_MIN_HEIGHT_PX), TEXTAREA_MAX_HEIGHT_PX);
  el.style.height = `${h}px`;
  el.style.overflowY = sh > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
}

function ModeChipIcon({ mode }: { mode: AtlasComposerMode }): JSX.Element {
  if (mode === "direct") {
    return <IconBolt />;
  }
  if (mode === "goal") {
    return <IconTag />;
  }
  return <IconClock />;
}

export function AtlasComposer({ disabled, pending, onCancel, onSend }: AtlasComposerProps): JSX.Element {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<AtlasComposerMode>("direct");
  const [showEmptyHint, setShowEmptyHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (el) {
      fitComposerTextarea(el);
    }
  }, [text]);

  const send = useCallback(() => {
    const t = text.trim();
    if (!t) {
      setShowEmptyHint(true);
      return;
    }
    setShowEmptyHint(false);
    onSend(t, mode);
    setText("");
    setMode("direct");
  }, [onSend, text, mode]);

  const handleQuickAction = useCallback(() => {
    setText(QUICK_ACTION_SAMPLE.slice(0, MAX));
    setShowEmptyHint(false);
    setMode("direct");
  }, []);

  const composerShellClass =
    showEmptyHint
      ? "atlas-composer atlas-composer--invalid"
      : "atlas-composer atlas-composer--live";

  return (
    <div className="atlas-composer-wrap font-atlas">
      <div className="mx-auto max-w-2xl">
        <div className={composerShellClass}>
          <div className="atlas-composer-input">
            <textarea
              ref={textareaRef}
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
              placeholder={PLACEHOLDERS[mode]}
              aria-label="Message to Atlas"
            />
          </div>
          <div className="atlas-composer-bar">
            <button
              type="button"
              disabled={pending}
              aria-pressed={mode === "direct"}
              className={`atlas-composer-pill${mode === "direct" ? " atlas-composer-pill--on" : ""}`}
              onClick={() => setMode("direct")}
            >
              <ModeChipIcon mode="direct" />
              Direct Atlas
              <span className="atlas-composer-pill-x" aria-hidden>
                ×
              </span>
            </button>
            <button
              type="button"
              disabled={pending}
              aria-pressed={mode === "goal"}
              className={`atlas-composer-pill${mode === "goal" ? " atlas-composer-pill--on" : ""}`}
              onClick={() => setMode("goal")}
            >
              <ModeChipIcon mode="goal" />
              Set goal
            </button>
            <button
              type="button"
              disabled={pending}
              aria-pressed={mode === "policy"}
              className={`atlas-composer-pill${mode === "policy" ? " atlas-composer-pill--on" : ""}`}
              onClick={() => setMode("policy")}
            >
              <ModeChipIcon mode="policy" />
              Set policy
            </button>
            <div className="atlas-composer-actions">
              <button
                type="button"
                disabled={disabled}
                title="Attach"
                aria-label="Attach file (demo — not wired)"
                className="atlas-composer-icon-btn"
              >
                <IconPaperclip />
              </button>
              <button
                type="button"
                disabled={disabled}
                title="Quick action"
                aria-label="Quick action: insert sample instruction"
                onClick={handleQuickAction}
                className="atlas-composer-icon-btn"
              >
                <IconQuickBolt />
              </button>
              {pending && onCancel ? (
                <button type="button" onClick={onCancel} className="atlas-composer-cancel" aria-label="Cancel assistant reply">
                  Cancel
                </button>
              ) : null}
              <button type="button" onClick={send} disabled={disabled} className="atlas-composer-send" aria-label="Send message" title="Send">
                <span className="atlas-composer-send-char" aria-hidden>
                  ↑
                </span>
              </button>
            </div>
          </div>
        </div>
        {showEmptyHint ? (
          <p className="mt-2 text-center text-xs text-amber-800" role="alert">
            Enter a message before sending.
          </p>
        ) : null}
        <p className="atlas-composer-foot">
          <span>
            {text.length}/{MAX} · Enter send · Shift+Enter newline{pending ? " · Cancel stops the reply" : ""}
          </span>
          <span>{HINTS[mode]}</span>
        </p>
      </div>
    </div>
  );
}
