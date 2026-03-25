"use client";

import { useState } from "react";
import { AppChrome } from "@/components/layout/app-chrome";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";

export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AppChrome
      sidebar={
        <WorkspaceSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        />
      }
    >
      {children}
    </AppChrome>
  );
}
