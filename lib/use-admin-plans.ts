"use client";

import { useCallback } from "react";
import { comviaFetch } from "@/lib/comviaFetch";
import type { Paginated, SubscriptionPlan } from "@/lib/subscription";
import { useComviaQuery } from "@/lib/use-comvia-query";

/** Tối đa 100 gói/trang (admin map 8A) — đủ cho ô chọn gói; kể cả gói đã tắt để sửa kỳ cũ. */
export function useAdminPlans(enabled = true) {
  const fetcher = useCallback(
    (token: string) => comviaFetch<Paginated<SubscriptionPlan>>("/admin/subscription-plans?page=1&limit=100", { token }),
    [],
  );
  return useComviaQuery(enabled, fetcher);
}

/** Nhãn ô chọn gói: tên · số năm, kèm "(đã tắt)" cho gói ngừng bán. */
export function planOptionLabel(plan: Pick<SubscriptionPlan, "name" | "durationYears" | "isActive">) {
  return `${plan.name} · ${plan.durationYears} năm${plan.isActive ? "" : " (đã tắt)"}`;
}
