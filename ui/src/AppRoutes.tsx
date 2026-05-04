import type { JSX } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AssistantWorkspaceLayout } from "./layouts/AssistantWorkspaceLayout.js";
import { BuyerAssistantPage } from "./pages/BuyerAssistantPage.js";
import { ExchangePage } from "./pages/ExchangePage.js";
import { SellerAssistantPage } from "./pages/SellerAssistantPage.js";

export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<ExchangePage />} />
      <Route path="/atlas" element={<Navigate to="/buyer" replace />} />
      <Route element={<AssistantWorkspaceLayout />}>
        <Route path="/buyer" element={<BuyerAssistantPage />} />
        <Route path="/seller" element={<SellerAssistantPage />} />
      </Route>
    </Routes>
  );
}
