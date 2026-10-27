"use client";

import type { ReactNode } from "react";
import { HiOutlineEllipsisHorizontal } from "react-icons/hi2";
import { ctaTypeLabel, type TemplateCtaDraft } from "@/lib/template-cta";

/**
 * Khung điện thoại dùng chung cho 3 preview mẫu tin (bảng/văn bản/OTP).
 * Chủ ý dùng màu cố định (white/zinc + xanh Zalo) thay vì token theme:
 * đây là mô phỏng tin nhắn trên Zalo, phải đọc như nhau ở light/dark mode.
 */
export function PreviewFrame({ children, logoUrl }: { children: ReactNode; logoUrl?: string | null }) {
  return (
    <div className="mx-auto w-full max-w-[100%] rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-800 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-lg bg-blue-50 text-[11px] font-bold text-blue-600">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Logo OA" className="size-full object-contain" />
          ) : (
            "OA"
          )}
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

export function PreviewCtas({ buttons }: { buttons: TemplateCtaDraft[] }) {
  return buttons.length > 0 ? (
    <div className="mt-4 space-y-2">
      {buttons.map((button, index) => (
        <PreviewCta key={button.id ?? index} label={button.label.trim() || ctaTypeLabel(button.type)} />
      ))}
    </div>
  ) : null;
}
