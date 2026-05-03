import type { JSX } from "react";
import { Outlet } from "react-router-dom";

import { AssistantSidebar } from "../components/atlas/AssistantSidebar.js";

export function AssistantWorkspaceLayout(): JSX.Element {
  return (
    <div className="flex h-screen min-h-0 bg-[oklch(0.985_0.004_80)] text-[oklch(0.18_0.01_80)]">
      <AssistantSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
