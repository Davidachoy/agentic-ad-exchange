import type { JSX } from "react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { IconPaperclip, IconQuickBolt, IconStopGeneration } from "./AtlasComposerIcons.js";

const MAX = 4000;

const TEXTAREA_MIN_HEIGHT_PX = 22;
const TEXTAREA_MAX_HEIGHT_PX = 52;

export interface AssistantComposerModeField {
  id: string;
  label: string;
  placeholder: string;
  hint: string;
  /** Classes appended to `atlas-composer-pill` when this mode is active (include contrast text). */
  pillOnClassName: string;
}

function fitComposerTextarea(el: HTMLTextAreaElement): void {
  el.style.height = "auto";
  const sh = el.scrollHeight;
  const h = Math.min(Math.max(sh, TEXTAREA_MIN_HEIGHT_PX), TEXTAREA_MAX_HEIGHT_PX);
  el.style.height = `${h}px`;
  el.style.overflowY = sh > TEXTAREA_MAX_HEIGHT_PX ? "auto" : "hidden";
}

export interface AssistantModeComposerProps {
  modes: readonly AssistantComposerModeField[];
  defaultModeId: string;
  /** Mode to select after a successful send (e.g. buyer `direct`, seller `set_floor`). */
  resetModeIdAfterSend: string;
  messageAriaLabel: string;
  quickInsertText?: string;
  disabled?: boolean;
  /** When true, composer is in a “thinking” state — send becomes a stop control if `onCancel` is set. */
  pending?: boolean;
  /** Invoked when the user clicks stop while `pending` (aborts API or local simulation). */
  onCancel?: () => void;
  onSend: (text: string, modeId: string) => void;
  renderModeIcon: (modeId: string) => JSX.Element;
}

export function AssistantModeComposer({
  modes,
  defaultModeId,
  resetModeIdAfterSend,
  messageAriaLabel,
  quickInsertText,
  disabled,
  pending,
  onCancel,
  onSend,
  renderModeIcon,
}: AssistantModeComposerProps): JSX.Element {
  const [text, setText] = useState("");
  const [mode, setMode] = useState(defaultModeId);
  const [showEmptyHint, setShowEmptyHint] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const modeMeta = modes.find((x) => x.id === mode) ?? modes[0];

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
    setMode(resetModeIdAfterSend);
  }, [onSend, text, mode, resetModeIdAfterSend]);

  const handleQuickAction = useCallback(() => {
    if (quickInsertText) {
      setText(quickInsertText.slice(0, MAX));
      setShowEmptyHint(false);
      setMode(defaultModeId);
    }
  }, [quickInsertText, defaultModeId]);

  const composerShellClass =
    showEmptyHint ? "atlas-composer atlas-composer--invalid" : "atlas-composer atlas-composer--live";

  return (
    <div className="atlas-composer-wrap font-atlas">
      <div className="mx-auto min-w-0 max-w-2xl">
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
                  if (!pending) {
                    send();
                  }
                }
              }}
              disabled={disabled}
              rows={1}
              placeholder={modeMeta?.placeholder ?? ""}
              aria-label={messageAriaLabel}
            />
          </div>
          <div className="atlas-composer-bar">
            {modes.map((m) => {
              const selected = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={disabled || pending}
                  aria-pressed={selected}
                  className={`atlas-composer-pill${selected ? ` ${m.pillOnClassName}` : ""}`}
                  onClick={() => setMode(m.id)}
                >
                  {renderModeIcon(m.id)}
                  {m.label}
                </button>
              );
            })}
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
              {quickInsertText ? (
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
              ) : null}
              {pending && onCancel ? (
                <button
                  type="button"
                  onClick={onCancel}
                  className="atlas-composer-stop"
                  aria-label="Stop generation"
                  title="Stop"
                >
                  <IconStopGeneration />
                </button>
              ) : (
                <button type="button" onClick={send} disabled={disabled} className="atlas-composer-send" aria-label="Send message" title="Send">
                  <span className="atlas-composer-send-char" aria-hidden>
                    ↑
                  </span>
                </button>
              )}
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
            {text.length}/{MAX} · Enter send · Shift+Enter newline{pending ? " · Stop cancels generation" : ""}
          </span>
          <span>{modeMeta?.hint ?? ""}</span>
        </p>
      </div>
    </div>
  );
}
