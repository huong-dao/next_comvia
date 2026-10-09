"use client";

import { useEffect, useRef } from "react";
import { comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";

/** Nhịp poll và thời gian tối đa — theo thiết kế SA ("Polling trạng thái", coding-convention.md). */
const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 5 * 60 * 1_000;

/** `TopupStatus` — Phụ lục A FRONTEND_API_GUIDE_NEXTJS.mdc. */
export type TopupStatusValue = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

/** Trạng thái kết thúc thất bại dứt điểm (không thể thành PAID nữa) — §9.5. */
export type TopupFailedStatus = "FAILED" | "EXPIRED";
const FAILED_STATUSES: readonly TopupFailedStatus[] = ["FAILED", "EXPIRED"];

/** Response của `GET /topups/:topupCode/status` — §9.5 FRONTEND_API_GUIDE_NEXTJS.mdc. */
export type TopupStatusResponse = {
  id: string;
  topupCode: string;
  status: TopupStatusValue;
  paidAt: string | null;
  amountExclVat: number;
  vatAmount: number;
  amountInclVat: number;
};

export type UseTopupStatusPollingOptions = {
  workspaceId: string;
  /** Gọi một lần khi topup chuyển `PAID`; polling tự dừng ngay trước đó. Kèm response để nơi gọi hiển thị số tiền đã nạp. */
  onPaid: (res: TopupStatusResponse) => void;
  /** Gọi một lần khi topup chuyển trạng thái thất bại dứt điểm (`FAILED`/`EXPIRED`); polling tự dừng ngay trước đó. */
  onFailed?: (status: TopupFailedStatus) => void;
  /** Gọi một lần khi quá 5 phút mà chưa kết thúc; polling tự dừng ngay trước đó. */
  onTimeout?: () => void;
};

/**
 * Poll `GET /topups/:topupCode/status` mỗi 3s tới khi `PAID` (gọi `onPaid`), gặp trạng thái
 * thất bại dứt điểm `FAILED`/`EXPIRED` (gọi `onFailed`), hoặc quá 5 phút (gọi `onTimeout`).
 * Chỉ chạy khi `topupCode` khác null; tự dọn interval/timeout khi `topupCode` về null hoặc
 * component unmount. Việc refetch balance / bắn toast do nơi gọi xử lý qua callback.
 *
 * @see docs/tickets/TICKET-003.md, coding-convention.md mục "Polling trạng thái".
 */
export function useTopupStatusPolling(
  topupCode: string | null,
  { workspaceId, onPaid, onFailed, onTimeout }: UseTopupStatusPollingOptions,
) {
  // Giữ callback trong ref: đổi identity của callback không reset vòng polling.
  const onPaidRef = useRef(onPaid);
  const onFailedRef = useRef(onFailed);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onPaidRef.current = onPaid;
    onFailedRef.current = onFailed;
    onTimeoutRef.current = onTimeout;
  }, [onPaid, onFailed, onTimeout]);

  useEffect(() => {
    if (!topupCode) return;

    let stopped = false;
    let inFlight = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const stop = () => {
      stopped = true;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const poll = async () => {
      // Bỏ qua nếu đã dừng hoặc còn request trước chưa xong (tránh chồng request).
      if (stopped || inFlight) return;
      const token = getAccessToken();
      if (!token) return; // Chưa có token: bỏ nhịp này, chờ nhịp sau.

      inFlight = true;
      try {
        const res = await comviaFetch<TopupStatusResponse>(
          `/topups/${topupCode}/status`,
          {
            method: "GET",
            token,
            headers: {
              "x-workspace-id": workspaceId, // Khớp WorkspaceHeaderGuard — §9.5.
            },
          },
        );
        if (stopped) return; // Response về sau khi đã dọn: không gọi callback.
        if (res.status === "PAID") {
          stop();
          onPaidRef.current(res);
          return;
        }
        if (FAILED_STATUSES.includes(res.status as TopupFailedStatus)) {
          stop();
          onFailedRef.current?.(res.status as TopupFailedStatus);
        }
      } catch {
        // Lỗi mạng/tạm thời: nuốt lỗi và giữ polling tới khi PAID hoặc timeout.
      } finally {
        inFlight = false;
      }
    };

    timeoutId = setTimeout(() => {
      stop();
      onTimeoutRef.current?.();
    }, POLL_TIMEOUT_MS);

    void poll(); // Kiểm tra ngay lần đầu, không chờ hết nhịp 3s.
    intervalId = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return stop; // Dọn khi topupCode đổi/về null hoặc unmount.
  }, [topupCode, workspaceId]);
}
