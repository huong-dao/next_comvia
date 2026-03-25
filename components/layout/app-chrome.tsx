"use client";

import { WorkspaceTopbar } from "@/components/layout/workspace-topbar";

/**
 * Shared chrome: left sidebar slot + same header/main column as workspace (`AppShell`).
 */
export function AppChrome({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background p-5">
      <div className="flex min-h-screen w-full">
        {sidebar}
        <div className="flex min-h-screen flex-1 flex-col px-5">
          <WorkspaceTopbar />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
