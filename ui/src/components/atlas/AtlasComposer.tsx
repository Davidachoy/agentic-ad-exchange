import type { JSX } from "react";

import type { AtlasComposerMode } from "../../assistant/atlasComposerSimulation.js";

import { AssistantModeComposer } from "./AssistantModeComposer.js";
import { BUYER_COMPOSER_MODES, BUYER_QUICK_INSERT, renderBuyerComposerIcon } from "./buyerComposerModes.js";

export type { AtlasComposerMode } from "../../assistant/atlasComposerSimulation.js";

export interface AtlasComposerProps {
  disabled?: boolean;
  pending?: boolean;
  onCancel?: () => void;
  onSend: (text: string, mode: AtlasComposerMode) => void;
}

export function AtlasComposer({ disabled, pending, onCancel, onSend }: AtlasComposerProps): JSX.Element {
  return (
    <AssistantModeComposer
      modes={BUYER_COMPOSER_MODES}
      defaultModeId="direct"
      resetModeIdAfterSend="direct"
      messageAriaLabel="Message to Atlas"
      quickInsertText={BUYER_QUICK_INSERT}
      disabled={disabled}
      pending={pending}
      onCancel={onCancel}
      onSend={(text, modeId) => onSend(text, modeId as AtlasComposerMode)}
      renderModeIcon={renderBuyerComposerIcon}
      modePicker="plus"
      plusPickerAriaLabel="Add Atlas mode"
      plusPickerTitle="Add Atlas mode"
      plusMenuAriaLabel="Atlas assistant modes"
    />
  );
}
