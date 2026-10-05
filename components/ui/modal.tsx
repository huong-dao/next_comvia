"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  // Guard SSR: `document` chưa tồn tại khi render trên server. Chỉ portal sau khi
  // mount client (cùng pattern mounted-guard với components/ui/toast.tsx).
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  // Portal thẳng ra <body> để overlay `fixed inset-0` neo theo viewport, thoát
  // mọi containing block do tổ tiên tạo ra (vd Card có backdrop-blur). Giữ z-40
  // thấp hơn toast (z-50) để toast luôn nổi trên modal.
  return createPortal(
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
    </div>,
    document.body,
  );
}
