"use client";

import { useState } from "react";
import { AppChrome } from "@/components/layout/app-chrome";
import { InternalSidebar } from "@/components/layout/internal-sidebar";

export function InternalAppShell({
  variant,
  children,
}: {
  variant: "admin" | "staff";
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <AppChrome
      sidebar={
        <InternalSidebar
          variant={variant}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        />
      }
    >
      {children}
    </AppChrome>
  );
}
