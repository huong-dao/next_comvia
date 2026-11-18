"use client";

import { HiOutlineChevronDown, HiOutlineChevronUp } from "react-icons/hi2";
import { previewTemplateContent } from "@/lib/template-placeholders";
import { PreviewCtas, PreviewFrame, PreviewTitle } from "./preview-frame";
import type { TemplateCtaDraft } from "@/lib/template-cta";

type TablePreviewProps = {
  title: string;
  content: string;
  placeholders: Record<string, string>;
  placeholderLabels?: Record<string, string>;
  secondaryContent: string;
  logoUrl?: string | null;
  ctaButtons: TemplateCtaDraft[];
  onMoveRow?: (slug: string, dir: -1 | 1) => void;
};

/** Preview mẫu tin "Dạng bảng" (hình 4): tiêu đề + đoạn mở + bảng key-value + nội dung phụ + CTA. */
export function TablePreview({ title, content, placeholders, placeholderLabels, secondaryContent, logoUrl, ctaButtons, onMoveRow }: TablePreviewProps) {
  const rendered = previewTemplateContent(content, placeholders);
  // Chỉ hiện trong bảng những biến có nhập Nhãn — biến chỉ dùng trong content (không có nhãn) thì ẩn khỏi bảng.
  const rows = Object.entries(placeholders).filter(([slug]) => Boolean(placeholderLabels?.[slug]));

  return (
    <PreviewFrame logoUrl={logoUrl}>
      <PreviewTitle title={title} />
      {rendered ? (
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{rendered}</p>
      ) : null}
      {rows.length > 0 ? (
        <dl className="my-3 space-y-1.5">
          {rows.map(([slug, value], index) => (
            <div key={slug} className={onMoveRow ? "grid grid-cols-[112px_1fr_auto] items-center gap-2 text-[13px]" : "grid grid-cols-[112px_1fr] gap-2 text-[13px]"}>
              <dt className="text-zinc-500">{placeholderLabels?.[slug] || slug}</dt>
              <dd className="font-semibold text-zinc-900">{value || "—"}</dd>
              {onMoveRow ? (
                <div className="flex items-center">
                  <button
                    type="button"
                    aria-label="Chuyển lên"
                    title="Chuyển lên"
                    disabled={index === 0}
                    onClick={() => onMoveRow(slug, -1)}
                    className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <HiOutlineChevronUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Chuyển xuống"
                    title="Chuyển xuống"
                    disabled={index === rows.length - 1}
                    onClick={() => onMoveRow(slug, 1)}
                    className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <HiOutlineChevronDown className="size-3.5" />
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}
      {secondaryContent ? (
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{secondaryContent}</p>
      ) : null}
      <PreviewCtas buttons={ctaButtons} />
    </PreviewFrame>
  );
}
