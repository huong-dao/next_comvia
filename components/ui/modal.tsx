"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

/** Lớp max-width theo kích thước modal. `md` giữ nguyên hành vi cũ. */
const SIZE_MAX_WIDTH: Record<"md" | "lg" | "xl", string> = {
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  size = "md",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  /** Nếu truyền, thay thế footer mặc định (chỉ nút đóng). */
  footer?: React.ReactNode;
  /** Chiều rộng tối đa của popup. Mặc định `md` (= `max-w-2xl`, giữ hành vi cũ). */
  size?: "md" | "lg" | "xl";
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
      <div className={cn("w-full rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]", SIZE_MAX_WIDTH[size])}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            className={cn("rounded-md p-1 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground")}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex justify-end gap-3">
          {footer ?? (
            <Button variant="ghost" onClick={onClose}>
              Đóng
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
