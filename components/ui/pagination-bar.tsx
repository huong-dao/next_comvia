"use client";

import { HiChevronLeft, HiChevronRight } from "react-icons/hi2";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { getPaginationRange } from "@/lib/pagination-range";

export type PaginationBarProps = {
  /** Trang hiện tại (bắt đầu từ 1). */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Gắn `aria-label` cho nhóm nút trang (tuỳ chọn). */
  ariaLabel?: string;
};

export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  className,
  ariaLabel = "Phân trang",
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const page = Math.min(Math.max(1, currentPage), totalPages);
  const items = getPaginationRange(page, totalPages);

  return (
    <nav aria-label={ariaLabel} className={cn("flex flex-wrap items-center justify-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="px-2"
        disabled={page <= 1}
        icon={<HiChevronLeft className="size-4" />}
        aria-label="Trang trước"
        onClick={() => onPageChange(page - 1)}
      />
      {items.map((item, i) =>
        item === "ellipsis" ? (
          <span key={`e-${i}`} className="select-none px-2 text-sm text-muted-foreground" aria-hidden>
            …
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            variant={item === page ? "secondary" : "outline"}
            size="sm"
            className="min-w-9 px-2 tabular-nums"
            aria-current={item === page ? "page" : undefined}
            aria-label={`Trang ${item}`}
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        ),
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="px-2"
        disabled={page >= totalPages}
        icon={<HiChevronRight className="size-4" />}
        iconPosition="right"
        aria-label="Trang sau"
        onClick={() => onPageChange(page + 1)}
      />
    </nav>
  );
}
