"use client";

import { cn } from "@/lib/cn";
import { PaginationBar } from "@/components/ui/pagination-bar";

/**
 * Chân bảng chuẩn: dòng "Hiển thị x–y trong N <đơn vị>" + thanh số trang.
 * Dùng chung cho mọi bảng danh sách để khỏi lặp lại markup ở từng trang.
 */
export function TablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  unitLabel = "bản ghi",
  ariaLabel = "Phân trang",
  className,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** Danh từ đếm được, vd "đơn", "mẫu tin", "thành viên". */
  unitLabel?: string;
  ariaLabel?: string;
  className?: string;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className={cn("mt-4 space-y-4 border-t border-border/60 pt-4", className)}>
      <p className="text-center text-sm text-muted-foreground">
        Hiển thị {total === 0 ? "0" : `${from}–${to}`} trong {total} {unitLabel}
      </p>
      <PaginationBar currentPage={page} totalPages={totalPages} onPageChange={onPageChange} ariaLabel={ariaLabel} />
    </div>
  );
}
