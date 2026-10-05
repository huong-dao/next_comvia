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

// Đếm số modal đang mở để khoá cuộn nền (body) đúng cách khi nhiều modal chồng
// nhau: chỉ modal đầu tiên khoá, modal cuối cùng đóng mới khôi phục giá trị cũ.
let openModalCount = 0;
let previousBodyOverflow = "";

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

  // Khoá cuộn nền khi modal mở; khôi phục khi đóng/unmount. Dùng bộ đếm module
  // để nhiều modal chồng nhau không khôi phục sớm (chỉ modal cuối cùng khôi phục).
  React.useEffect(() => {
    if (!open) return;
    if (openModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    openModalCount += 1;
    return () => {
      openModalCount -= 1;
      if (openModalCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
      }
    };
  }, [open]);

  if (!open || !mounted) return null;

  // Portal thẳng ra <body> để overlay `fixed inset-0` neo theo viewport, thoát
  // mọi containing block do tổ tiên tạo ra (vd Card có backdrop-blur). Giữ z-40
  // thấp hơn toast (z-50) để toast luôn nổi trên modal.
  return createPortal(
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/55 p-4">
      {/* Hộp popup: flex column, giới hạn chiều cao theo viewport (chừa lề p-4
          trên+dưới = 2rem). Header/footer cố định, chỉ phần body cuộn. */}
      <div
        className={cn(
          "flex max-h-[calc(100dvh-2rem)] w-full flex-col rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]",
          SIZE_MAX_WIDTH[size],
        )}
      >
        <div className="flex shrink-0 items-center justify-between px-6 pb-5 pt-6">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            className={cn("rounded-md p-1 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground")}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {/* min-h-0 để vùng cuộn co lại được trong flex column; px chừa lề 2 bên. */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6">{children}</div>
        <div className="flex shrink-0 justify-end gap-3 px-6 pb-6 pt-6">
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
