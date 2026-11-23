"use client";

import { useEffect, useRef } from "react";
import { getAccessToken } from "@/lib/auth";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspaceHeader, type SubscriptionPurchase } from "@/lib/subscription";

/** Gợi ý của guide 9B.4: 3–5 giây. Cùng nhịp với poll topup. */
const POLL_INTERVAL_MS = 3_000;

export type UseSubscriptionPurchasePollingOptions = {
  workspaceId: string;
  /** Gọi một lần khi đơn `PAID`; polling tự dừng ngay trước đó. */
  onPaid: (purchase: SubscriptionPurchase) => void;
  /** Gọi một lần khi đơn `FAILED`; polling tự dừng ngay trước đó. */
  onFailed?: (purchase: SubscriptionPurchase) => void;
};

/**
 * Poll `GET /subscriptions/purchases/:purchaseCode/status` (OWNER) tới khi `PAID`/`FAILED`.
 * Đơn `PENDING` không tự hết hạn (quickref A3) nên không đặt timeout: polling chỉ dừng khi
 * `purchaseCode` về `null` (đóng QR) hoặc unmount. Lỗi tạm thời (mạng, 404 ngay sau khi tạo) bị bỏ qua.
 */
export function useSubscriptionPurchasePolling(
  purchaseCode: string | null,
  { workspaceId, onPaid, onFailed }: UseSubscriptionPurchasePollingOptions,
) {
  // Callback giữ trong ref để đổi identity không reset vòng polling.
  const onPaidRef = useRef(onPaid);
  const onFailedRef = useRef(onFailed);
  useEffect(() => {
    onPaidRef.current = onPaid;
    onFailedRef.current = onFailed;
  }, [onPaid, onFailed]);

  useEffect(() => {
    if (!purchaseCode) return;

    let stopped = false;
    let inFlight = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      stopped = true;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const poll = async () => {
      if (stopped || inFlight) return;
      const token = getAccessToken();
      if (!token) return;

      inFlight = true;
      try {
        const res = await comviaFetch<SubscriptionPurchase>(
          `/subscriptions/purchases/${encodeURIComponent(purchaseCode)}/status`,
          { token, headers: workspaceHeader(workspaceId) },
        );
        if (stopped) return;
        if (res.status === "PAID") {
          stop();
          onPaidRef.current(res);
        } else if (res.status === "FAILED") {
          stop();
          onFailedRef.current?.(res);
        }
      } catch {
        // Giữ polling: lỗi mạng/tạm thời không được làm mất đơn đang chờ thanh toán.
      } finally {
        inFlight = false;
      }
    };

    void poll();
    intervalId = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return stop;
  }, [purchaseCode, workspaceId]);
}
