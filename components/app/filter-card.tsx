import type { ReactNode } from "react";
import { HiOutlineAdjustmentsHorizontal, HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Thẻ "Bộ lọc" dùng chung: các ô lọc + nút Áp dụng / Làm mới. */
export function FilterCard({
  children,
  onApply,
  onRefresh,
  note,
}: {
  children: ReactNode;
  onApply: () => void;
  onRefresh: () => void;
  note?: ReactNode;
}) {
  return (
    <Card className="mb-6 space-y-4">
      <div className="flex items-center gap-2">
        <HiOutlineAdjustmentsHorizontal className="size-5 text-secondary" />
        <p className="text-sm font-semibold text-foreground">Bộ lọc</p>
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        {children}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onApply}
          icon={<HiOutlineClipboardDocumentList className="size-4" />}
        >
          Áp dụng
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onRefresh}>
          Làm mới
        </Button>
      </div>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </Card>
  );
}

export function FilterField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs text-muted-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
