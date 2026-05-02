import type { JSX } from "react";
import { Route, Routes } from "react-router-dom";

import { AtlasAssistantPage } from "./pages/AtlasAssistantPage.js";
import { ExchangePage } from "./pages/ExchangePage.js";

export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<ExchangePage />} />
      <Route path="/atlas" element={<AtlasAssistantPage />} />
    </Routes>
  );
}
