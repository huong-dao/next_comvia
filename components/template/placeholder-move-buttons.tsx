"use client";

import type { Dispatch, SetStateAction } from "react";
import { HiOutlineChevronDown, HiOutlineChevronUp } from "react-icons/hi2";
import type { PlaceholderRow } from "@/lib/template-placeholders";

const BTN =
  "rounded p-0.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

/** Hai nút nhỏ lên/xuống đổi vị trí một dòng trong danh sách "Các trường thông tin". */
export function PlaceholderMoveButtons({
  rows,
  rowId,
  setRows,
  disabled,
}: {
  rows: PlaceholderRow[];
  rowId: string;
  setRows: Dispatch<SetStateAction<PlaceholderRow[]>>;
  disabled?: boolean;
}) {
  const index = rows.findIndex((row) => row.id === rowId);
  function move(dir: -1 | 1) {
    setRows((current) => {
      const from = current.findIndex((row) => row.id === rowId);
      const to = from + dir;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }
  return (
    <div className="flex shrink-0 flex-col justify-center self-center mt-5">
      <button type="button" className={BTN} title="Chuyển lên" aria-label="Chuyển lên" disabled={disabled || index <= 0} onClick={() => move(-1)}>
        <HiOutlineChevronUp className="size-3.5" />
      </button>
      <button type="button" className={BTN} title="Chuyển xuống" aria-label="Chuyển xuống" disabled={disabled || index < 0 || index >= rows.length - 1} onClick={() => move(1)}>
        <HiOutlineChevronDown className="size-3.5" />
      </button>
    </div>
  );
}
