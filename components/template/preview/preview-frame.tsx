"use client";

import type { ReactNode } from "react";
import { HiOutlineEllipsisHorizontal } from "react-icons/hi2";

/**
 * Khung điện thoại dùng chung cho 3 preview mẫu tin (bảng/văn bản/OTP).
 * Chủ ý dùng màu cố định (white/zinc + xanh Zalo) thay vì token theme:
 * đây là mô phỏng tin nhắn trên Zalo, phải đọc như nhau ở light/dark mode.
 */
export function PreviewFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[360px] rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-800 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 text-[11px] font-bold text-blue-600">
          OA
        </div>
        <HiOutlineEllipsisHorizontal className="size-5 text-zinc-400" />
      </div>
      {children}
    </div>
  );
}

/** Nút CTA xanh dưới đáy tin (mô phỏng, không tương tác). */
export function PreviewCta({ label }: { label: string }) {
  return (
    <div className="mt-4 w-full rounded-xl bg-[#2962ff] py-2.5 text-center text-sm font-semibold text-white">
      {label}
    </div>
  );
}
