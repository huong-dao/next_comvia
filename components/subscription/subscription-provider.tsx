"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspaceHeader, type CurrentSubscription } from "@/lib/subscription";
import { useComviaQuery } from "@/lib/use-comvia-query";

type SubscriptionContextValue = {
  /** `null` khi chưa tải xong hoặc tải lỗi — lúc đó UI không được suy ra `canSend`. */
  current: CurrentSubscription | null;
  loading: boolean;
  refetch: () => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

/**
 * Giữ `GET /subscriptions/current` của workspace đang mở (guide 9B.2), gọi lại khi đổi workspace.
 * Lỗi tải (vd `403`) không chặn trang: banner chỉ ẩn, server vẫn là nơi quyết định cho phép gửi tin.
 */
export function SubscriptionProvider({ workspaceId, children }: { workspaceId: string; children: ReactNode }) {
  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<CurrentSubscription>("/subscriptions/current", {
        token,
        headers: workspaceHeader(workspaceId),
      }),
    [workspaceId],
  );
  const { data, loading, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const value = useMemo<SubscriptionContextValue>(
    () => ({ current: data, loading, refetch }),
    [data, loading, refetch],
  );

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

/** Ngoài `SubscriptionProvider` (vd trang admin) trả `null`. */
export function useOptionalSubscription() {
  return useContext(SubscriptionContext);
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used inside SubscriptionProvider");
  return ctx;
}

/**
 * `false` chỉ khi server đã báo `canSend=false`; chưa tải/không có dữ liệu → `undefined`
 * để không khóa nút gửi chỉ vì `/current` chưa về (server vẫn chặn đúng).
 */
export function useCanSend(): boolean | undefined {
  const ctx = useContext(SubscriptionContext);
  return ctx?.current ? ctx.current.canSend : undefined;
}
