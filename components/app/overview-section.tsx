"use client";

import { useCallback, useState } from "react";
import { useParams } from "next/navigation";
import {
  HiOutlineChartBar,
  HiOutlineClock,
  HiOutlineDocumentText,
  HiOutlinePaperAirplane,
  HiOutlineUsers,
} from "react-icons/hi2";
import type { StatBlockDelta } from "@/components/app/stat-block";
import { StatBlock } from "@/components/app/stat-block";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Select } from "@/components/ui/input";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

/**
 * Kỳ thống kê cho section "Tổng quan hoạt động".
 * "So với kỳ trước" = kỳ liền trước cùng độ dài (ISSUE-002).
 */
type OverviewPeriod = "7d" | "month" | "year";

const PERIOD_OPTIONS: { value: OverviewPeriod; label: string }[] = [
  { value: "7d", label: "7 ngày qua" },
  { value: "month", label: "tháng qua" },
  { value: "year", label: "năm qua" },
];

/**
 * Analytics overview thật (BR-02, §9A):
 * `GET /workspaces/:workspaceId/analytics/overview?period=7d|month|year` (mặc định 7d).
 * - `value`/`changePercent` có thể null (xem ghi chú §9A); backend có thể trả decimal dạng chuỗi
 *   → luôn coerce bằng Number() khi hiển thị (lưu ý chung backend-responses).
 * - `successRate.value` null (không có tin nào) → hiển thị "—".
 * - `changePercent` null (kỳ trước = 0/thiếu dữ liệu) → ẩn badge delta.
 * - `activeTemplates.changePercent` luôn null (snapshot) → block này không có badge.
 * KHÔNG có "khách hàng tương tác" — backend không tính, FE hiển thị số demo tĩnh.
 */
type OverviewMetric = {
  value: number | string | null;
  changePercent: number | string | null;
};
type OverviewResponse = {
  messagesSent: OverviewMetric; // chỉ số 1: tin nhắn đã gửi
  activeTemplates: OverviewMetric; // chỉ số 3: mẫu tin APPROVED (changePercent luôn null)
  successRate: OverviewMetric; // chỉ số 4: % = SUCCESS/(SUCCESS+FAILED)*100 (value có thể null)
};

// Số demo — "Khách hàng tương tác" KHÔNG phải số liệu thật, backend không tính (ISSUE-002, §9A).
// KHÔNG đưa field này vào OverviewResponse; thay bằng chỉ số thật khi backend có hỗ trợ.
const DEMO_PLACEHOLDER_CUSTOMER_INTERACTION = 4320;
// Delta demo đi kèm, để khớp hình 1 (block này cũng có cụm "so với kỳ trước"). Cũng là số demo.
const DEMO_PLACEHOLDER_CUSTOMER_INTERACTION_DELTA: StatBlockDelta = { percent: 8, direction: "up" };

const numberFormatter = new Intl.NumberFormat("vi-VN");

/** Coerce field số (có thể null/chuỗi) về number | null. */
const toNumber = (raw: number | string | null | undefined): number | null => {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** Định dạng số đếm; null → "—". */
const formatCount = (raw: number | string | null | undefined): string => {
  const n = toNumber(raw);
  return n === null ? "—" : numberFormatter.format(n);
};

/** Tỷ lệ phần trăm; null (mẫu số 0) → "—". */
const formatPercent = (raw: number | string | null | undefined): string => {
  const n = toNumber(raw);
  return n === null ? "—" : `${n}%`;
};

/** changePercent → delta cho StatBlock; null → undefined (ẩn badge). */
const toDelta = (raw: number | string | null | undefined): StatBlockDelta | undefined => {
  const n = toNumber(raw);
  if (n === null) return undefined;
  return { percent: n, direction: n >= 0 ? "up" : "down" };
};

/**
 * Section "Tổng quan hoạt động" trên dashboard (ISSUE-002):
 * tiêu đề + dropdown chọn kỳ + 4 stat block. 3 chỉ số lấy từ analytics thật theo kỳ (BR-02/§9A);
 * "Khách hàng tương tác" là số demo tĩnh.
 */
export function OverviewSection() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const [period, setPeriod] = useState<OverviewPeriod>("7d");

  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<OverviewResponse>(
        `/workspaces/${workspaceId}/analytics/overview?period=${period}`,
        { token },
      ),
    [workspaceId, period],
  );
  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  return (
    <section className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <HiOutlineChartBar className="size-5 text-primary" aria-hidden />
          Tổng quan hoạt động
        </h2>
        <div className="w-40">
          <Select
            aria-label="Chọn kỳ thống kê"
            value={period}
            onChange={(e) => setPeriod(e.target.value as OverviewPeriod)}
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {loading ? (
        <PageLoading message="Đang tải tổng quan…" />
      ) : error ? (
        <PageError message={error} onRetry={() => void refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatBlock
            icon={<HiOutlinePaperAirplane className="size-5" />}
            value={formatCount(data?.messagesSent.value)}
            label="Tin nhắn đã gửi"
            delta={toDelta(data?.messagesSent.changePercent)}
          />
          <StatBlock
            icon={<HiOutlineUsers className="size-5" />}
            value={numberFormatter.format(DEMO_PLACEHOLDER_CUSTOMER_INTERACTION)}
            label="Khách hàng tương tác"
            delta={DEMO_PLACEHOLDER_CUSTOMER_INTERACTION_DELTA}
          />
          <StatBlock
            icon={<HiOutlineDocumentText className="size-5" />}
            value={formatCount(data?.activeTemplates.value)}
            label="Mẫu tin đang hoạt động"
            delta={toDelta(data?.activeTemplates.changePercent)}
          />
          <StatBlock
            icon={<HiOutlineClock className="size-5" />}
            value={formatPercent(data?.successRate.value)}
            label="Tỷ lệ gửi thành công"
            delta={toDelta(data?.successRate.changePercent)}
          />
        </div>
      )}
    </section>
  );
}
