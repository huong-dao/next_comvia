"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

export function WorkspaceTopbar() {
  return (
    <header className="mb-5 flex items-center gap-3">
      <div className="flex w-full items-center gap-3">
        <ThemeToggle iconOnly className="h-[34px] min-h-[34px] min-w-[34px] rounded-lg border-none !bg-surface-muted" />
      </div>
    </header>
  );
}
