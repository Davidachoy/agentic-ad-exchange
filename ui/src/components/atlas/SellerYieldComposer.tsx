import type { JSX } from "react";

import { AssistantModeComposer } from "./AssistantModeComposer.js";
import { renderSellerComposerIcon, SELLER_COMPOSER_MODES } from "./sellerComposerModes.js";

export interface SellerYieldComposerProps {
  disabled?: boolean;
  pending?: boolean;
  onCancel?: () => void;
  onSend: (text: string, modeId: string) => void;
}

export function SellerYieldComposer({ disabled, pending, onCancel, onSend }: SellerYieldComposerProps): JSX.Element {
  return (
    <AssistantModeComposer
      modes={SELLER_COMPOSER_MODES}
      defaultModeId="set_floor"
      resetModeIdAfterSend="set_floor"
      messageAriaLabel="Message to yield assistant"
      disabled={disabled}
      pending={pending}
      onCancel={onCancel}
      onSend={onSend}
      renderModeIcon={renderSellerComposerIcon}
    />
  );
}
