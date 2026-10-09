"use client";

import * as React from "react";
import {
  HiCheckCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXCircle,
} from "react-icons/hi2";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type AlertModalType = "success" | "error" | "warning" | "info";

export type AlertModalOptions = {
  type: AlertModalType;
  /** Tiêu đề popup. Mặc định suy ra từ `type` (vd "Thành công", "Có lỗi xảy ra"). */
  title?: string;
  message: string;
  /** Nhãn nút đóng. Mặc định "Đóng". */
  closeLabel?: string;
  /** Gọi khi người dùng đóng popup (nút đóng, nút X, click nền). */
  onClose?: () => void;
};

type AlertModalContextValue = {
  showAlert: (options: AlertModalOptions) => void;
};

const AlertModalContext = React.createContext<AlertModalContextValue | null>(null);

/**
 * Lấy hàm hiển thị modal alert (popup giữa màn hình, chặn thao tác tới khi đóng) dùng chung
 * toàn app — thay cho banner lỗi/thành công nằm lẻ tẻ trong từng form.
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
  { Icon: React.ComponentType<{ className?: string }>; iconClass: string; defaultTitle: string }
> = {
  success: { Icon: HiCheckCircle, iconClass: "text-success", defaultTitle: "Thành công" },
  error: { Icon: HiXCircle, iconClass: "text-danger", defaultTitle: "Có lỗi xảy ra" },
  warning: {
    Icon: HiExclamationTriangle,
    iconClass: "text-amber-500",
    defaultTitle: "Lưu ý",
  },
  info: { Icon: HiInformationCircle, iconClass: "text-primary", defaultTitle: "Thông báo" },
};

export function AlertModalProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = React.useState<AlertModalOptions | null>(null);

  const showAlert = React.useCallback((options: AlertModalOptions) => {
    setAlert(options);
  }, []);

  const handleClose = React.useCallback(() => {
    alert?.onClose?.();
    setAlert(null);
  }, [alert]);

  const value = React.useMemo<AlertModalContextValue>(() => ({ showAlert }), [showAlert]);

  const { Icon, iconClass, defaultTitle } = alert ? TYPE_CONFIG[alert.type] : TYPE_CONFIG.info;

  return (
    <AlertModalContext.Provider value={value}>
      {children}
      <Modal
        open={alert !== null}
        onClose={handleClose}
        title={alert?.title ?? defaultTitle}
        footer={<Button onClick={handleClose}>{alert?.closeLabel ?? "Đóng"}</Button>}
      >
        <div className="flex flex-col items-center space-y-3 py-2 text-center">
          <Icon className={cn("size-14", iconClass)} aria-hidden />
          <p className="text-sm text-foreground">{alert?.message}</p>
        </div>
      </Modal>
    </AlertModalContext.Provider>
  );
}
