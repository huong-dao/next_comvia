"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  HiCheckCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXCircle,
  HiXMark,
} from "react-icons/hi2";
import { cn } from "@/lib/cn";

export type ToastType = "success" | "error" | "warning" | "info";

export type ToastOptions = {
  type: ToastType;
  message: string;
  /** Thời gian tự ẩn (ms). Mặc định ~4000ms. Truyền <= 0 để không tự ẩn. */
  duration?: number;
};

type ToastItem = Required<Pick<ToastOptions, "type" | "message" | "duration">> & {
  id: number;
};

type ToastContextValue = {
  showToast: (options: ToastOptions) => void;
};

const DEFAULT_DURATION = 4000;

const ToastContext = React.createContext<ToastContextValue | null>(null);

/**
 * Lấy hàm hiển thị toast nổi dùng chung toàn app.
 * Phải được gọi bên trong <ToastProvider> (đã mount ở root layout).
 */
export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast phải được dùng bên trong <ToastProvider>.");
  }
  return ctx;
}

const TYPE_CONFIG: Record<
  ToastType,
  {
    Icon: React.ComponentType<{ className?: string }>;
    iconClass: string;
    barClass: string;
  }
> = {
  success: { Icon: HiCheckCircle, iconClass: "text-success", barClass: "bg-success" },
  error: { Icon: HiXCircle, iconClass: "text-danger", barClass: "bg-danger" },
  warning: {
    Icon: HiExclamationTriangle,
    iconClass: "text-amber-500",
    barClass: "bg-amber-500",
  },
  info: { Icon: HiInformationCircle, iconClass: "text-primary", barClass: "bg-primary" },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const { Icon, iconClass, barClass } = TYPE_CONFIG[toast.type];

  return (
    <div
      role="alert"
      className="pointer-events-auto flex items-stretch gap-3 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
    >
      <span className={cn("w-1 shrink-0 self-stretch rounded-full", barClass)} aria-hidden />
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconClass)} aria-hidden />
      <p className="flex-1 self-center text-sm text-foreground">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Đóng thông báo"
        className="shrink-0 self-start rounded-md p-0.5 text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
      >
        <HiXMark className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const idRef = React.useRef(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = React.useCallback(
    ({ type, message, duration = DEFAULT_DURATION }: ToastOptions) => {
      const id = (idRef.current += 1);
      setToasts((prev) => [...prev, { id, type, message, duration }]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
    },
    [dismiss],
  );

  // Dọn sạch mọi timer còn treo khi provider unmount.
  React.useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  const value = React.useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3">
            {toasts.map((toast) => (
              <ToastCard
                key={toast.id}
                toast={toast}
                onDismiss={() => dismiss(toast.id)}
              />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
