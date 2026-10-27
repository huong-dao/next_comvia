import type { ReactNode } from "react";
import { HiMiniArrowTrendingDown, HiMiniArrowTrendingUp } from "react-icons/hi2";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export type StatBlockDelta = {
  /** Độ lớn phần trăm so với kỳ trước (trang tự tính, đã làm tròn). */
  percent: number;
  /** Chiều biến động: "up" → tăng (xanh), "down" → giảm (đỏ). */
  direction: "up" | "down";
};

export type StatBlockProps = {
  /** Icon đứng cạnh nhãn (tùy chọn). */
  icon?: ReactNode;
  /** Giá trị hiển thị — trang tự format (vd formatVND) rồi truyền vào. */
  value: ReactNode;
  /** Nhãn mô tả chỉ số. */
  label: string;
  /** So sánh với kỳ trước (tùy chọn — không phải chỉ số nào cũng có). */
  delta?: StatBlockDelta;
  /** Class bổ sung cho Card bọc ngoài. */
  className?: string;
};

/**
 * Ô chỉ số dùng chung cho dashboard overview (ISSUE-002) và cụm "Tổng quan
 * tháng này" của ví (ISSUE-005). Thuần presentational — không tự format số.
 */
export function StatBlock({ icon, value, label, delta, className }: StatBlockProps) {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {delta ? (
        <span
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-sm font-medium tabular-nums",
            delta.direction === "up" ? "text-success" : "text-danger",
          )}
        >
          {delta.direction === "up" ? (
            <HiMiniArrowTrendingUp className="size-4" aria-hidden />
          ) : (
            <HiMiniArrowTrendingDown className="size-4" aria-hidden />
          )}
          {Math.abs(delta.percent)}%
        </span>
      ) : null}
    </Card>
  );
}
