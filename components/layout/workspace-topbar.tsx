"use client";

import { HiOutlineChatBubbleLeftRight, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function WorkspaceTopbar() {
  return (
    <header className="mb-5 flex items-center gap-3">
      <div className="flex w-full items-center gap-3">
        <Input
          placeholder="Search conversations..."
          leadingIcon={<HiOutlineMagnifyingGlass className="size-4" />}
          className="max-w-md bg-surface-muted/80 border-none"
        />
        <Button
          type="button"
          variant="outline"
          icon={<HiOutlineChatBubbleLeftRight className="size-4" />}
          className="h-[34px] min-w-[160px] whitespace-nowrap border-none !bg-surface-muted"
        >
          Open Quick Chat
        </Button>
        <ThemeToggle iconOnly className="h-[34px] min-h-[34px] min-w-[34px] rounded-lg border-none !bg-surface-muted" />
      </div>
    </header>
  );
}
