import type { JSX } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { IconPlus } from "./AtlasComposerIcons.js";
import type { AssistantComposerModeField } from "./AssistantModeComposer.js";

export interface AssistantComposerPlusModeRowProps {
  modes: readonly AssistantComposerModeField[];
  mode: string;
  setMode: (id: string) => void;
  disabled?: boolean;
  pending?: boolean;
  renderModeIcon: (modeId: string) => JSX.Element;
  /** Defaults: “Add mode”. */
  plusPickerAriaLabel?: string;
  plusPickerTitle?: string;
  /** Defaults: “Structured modes”. */
  plusMenuAriaLabel?: string;
}

/** General mode = `modes[0]`; structured options = `modes.slice(1)` behind a + menu (Claude-style). */
export function AssistantComposerPlusModeRow({
  modes,
  mode,
  setMode,
  disabled,
  pending,
  renderModeIcon,
  plusPickerAriaLabel = "Add mode",
  plusPickerTitle = "Add mode",
  plusMenuAriaLabel = "Structured modes",
}: AssistantComposerPlusModeRowProps): JSX.Element {
  const general = modes[0];
  const structured = modes.slice(1);
  const generalId = general?.id ?? "";
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const activeStructured = structured.find((m) => m.id === mode);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent): void => {
      if (wrapRef.current != null && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = useCallback(
    (id: string) => {
      setMode(id);
      setOpen(false);
    },
    [setMode],
  );

  const clearStructured = useCallback(() => {
    setMode(generalId);
  }, [setMode, generalId]);

  const blocked = Boolean(disabled || pending);

  return (
    <div ref={wrapRef} className="atlas-composer-plus-wrap">
      <button
        type="button"
        className={`atlas-composer-plus-btn${open ? " atlas-composer-plus-btn--open" : ""}`}
        disabled={blocked}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        title={plusPickerTitle}
        aria-label={plusPickerAriaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        <IconPlus />
      </button>
      {open ? (
        <div id={menuId} role="menu" aria-label={plusMenuAriaLabel} className="atlas-composer-plus-menu">
          {structured.map((m) => (
            <button
              key={m.id}
              type="button"
              role="menuitem"
              className="atlas-composer-plus-menu-item"
              onClick={() => pick(m.id)}
            >
              <span className="atlas-composer-plus-menu-icon" aria-hidden>
                {renderModeIcon(m.id)}
              </span>
              <span className="atlas-composer-plus-menu-label">{m.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      {activeStructured ? (
        <div className={`atlas-composer-pill ${activeStructured.pillOnClassName}`}>
          <span aria-hidden>{renderModeIcon(activeStructured.id)}</span>
          <span>{activeStructured.label}</span>
          <button
            type="button"
            className="atlas-composer-attached-clear"
            aria-label={`Clear ${activeStructured.label} mode`}
            title="Clear mode"
            disabled={blocked}
            onClick={clearStructured}
          >
            <span aria-hidden>×</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
