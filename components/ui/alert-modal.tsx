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

export type AlertModalType = "success" | "error" | "warning" | "info";

export type AlertModalOptions = {
  type: AlertModalType;
  /** Dòng tiêu đề in đậm. Mặc định suy ra từ `type` (vd "Thành công", "Có lỗi xảy ra"). */
  title?: string;
  message: string;
  /** Gọi khi đóng (bấm X hoặc tự hết giờ). */
  onClose?: () => void;
  /** Thời gian tự ẩn (ms). Mặc định 5000ms. Truyền <= 0 để không tự ẩn. */
  duration?: number;
};

type AlertItem = Required<Pick<AlertModalOptions, "type" | "message" | "duration">> &
  Pick<AlertModalOptions, "title" | "onClose"> & { id: number };

type AlertModalContextValue = {
  showAlert: (options: AlertModalOptions) => void;
};

const DEFAULT_DURATION = 5000;

const AlertModalContext = React.createContext<AlertModalContextValue | null>(null);

/**
 * Lấy hàm hiển thị thông báo nổi góc phải màn hình (trượt vào từ bên phải, tự tắt sau 5s hoặc
 * bấm X) dùng chung toàn app — thay cho banner lỗi/thành công nằm lẻ tẻ trong từng form.
 * Phải được gọi bên trong <AlertModalProvider> (đã mount ở root layout).
 */
export function useAlertModal(): AlertModalContextValue {
  const ctx = React.useContext(AlertModalContext);
  if (!ctx) {
    throw new Error("useAlertModal phải được dùng bên trong <AlertModalProvider>.");
  }
  return ctx;
}

const TYPE_CONFIG: Record<
  AlertModalType,
  {
    Icon: React.ComponentType<{ className?: string }>;
    defaultTitle: string;
    /** Nền đục (không alpha-blend với nội dung phía sau) để chữ luôn rõ nét. */
    className: string;
  }
> = {
  success: {
    Icon: HiCheckCircle,
    defaultTitle: "Thành công",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  error: {
    Icon: HiXCircle,
    defaultTitle: "Có lỗi xảy ra",
    className: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  },
  warning: {
    Icon: HiExclamationTriangle,
    defaultTitle: "Lưu ý",
    className: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  },
  info: {
    Icon: HiInformationCircle,
    defaultTitle: "Thông báo",
    className: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-300",
  },
};

function AlertCard({ item, onDismiss }: { item: AlertItem; onDismiss: () => void }) {
  const { Icon, defaultTitle, className } = TYPE_CONFIG[item.type];

  // Mount ở translate-x dương (ngoài màn hình bên phải) rồi trượt vào ngay sau đó.
  // Dùng setTimeout thay vì requestAnimationFrame: rAF không chạy khi tab/pane không
  // compositing (vd preview ẩn), khiến card đứng yên ở trạng thái "chưa vào".
  const [entered, setEntered] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setEntered(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="alert"
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-xl border p-4 shadow-[var(--shadow-soft)] transition-all duration-300 ease-out",
        className,
        entered ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-5">{item.title ?? defaultTitle}</p>
          <p className="mt-0.5 whitespace-pre-line text-sm leading-5">{item.message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
          className="shrink-0 rounded-md p-0.5 opacity-70 transition hover:opacity-100"
        >
          <HiXMark className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function AlertModalProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<AlertItem[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const itemsRef = React.useRef<AlertItem[]>([]);
  const timers = React.useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const idRef = React.useRef(0);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const dismiss = React.useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    itemsRef.current.find((item) => item.id === id)?.onClose?.();
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showAlert = React.useCallback(
    ({ type, title, message, onClose, duration = DEFAULT_DURATION }: AlertModalOptions) => {
      const id = (idRef.current += 1);
      setItems((prev) => [...prev, { id, type, title, message, onClose, duration }]);
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

  const value = React.useMemo<AlertModalContextValue>(() => ({ showAlert }), [showAlert]);

  return (
    <AlertModalContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed top-4 right-4 z-[1000] flex w-full max-w-sm flex-col gap-3">
            {items.map((item) => (
              <AlertCard key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
            ))}
          </div>,
          document.body,
        )}
    </AlertModalContext.Provider>
  );
}
