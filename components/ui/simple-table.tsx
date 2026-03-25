import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SimpleColumn<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
};

export function SimpleTable<T extends { id?: string } | Record<string, unknown>>({
  columns,
  rows,
  getRowKey,
  className,
  emptyMessage = "Không có dữ liệu",
}: {
  columns: SimpleColumn<T>[];
  rows: T[];
  getRowKey?: (row: T, index: number) => string;
  className?: string;
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card/80 px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left">
          <thead className="bg-surface-muted text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn("px-4 py-3 font-medium", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={getRowKey?.(row, index) ?? String((row as { id?: string }).id ?? index)}
                className="border-t border-border/70 text-sm"
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3 align-middle", col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
