import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "./AppRoutes.js";
import { DashboardDataProvider } from "./context/DashboardDataContext.js";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <DashboardDataProvider>
        <AppRoutes />
      </DashboardDataProvider>
    </BrowserRouter>
  </StrictMode>,
);
