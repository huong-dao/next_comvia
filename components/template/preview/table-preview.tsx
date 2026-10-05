"use client";

import { previewTemplateContent } from "@/lib/template-placeholders";
import { PreviewCta, PreviewFrame } from "./preview-frame";

type TablePreviewProps = {
  title: string;
  content: string;
  placeholders: Record<string, string>;
  secondaryContent: string;
};

/** Preview mẫu tin "Dạng bảng" (hình 4): tiêu đề + đoạn mở + bảng key-value + nội dung phụ + CTA. */
export function TablePreview({ title, content, placeholders, secondaryContent }: TablePreviewProps) {
  const rendered = previewTemplateContent(content, placeholders);
  const rows = Object.entries(placeholders);

  return (
    <PreviewFrame>
      {rendered ? (
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{rendered}</p>
      ) : null}
      {rows.length > 0 ? (
        <dl className="my-3 space-y-1.5">
          {rows.map(([slug, value]) => (
            <div key={slug} className="grid grid-cols-[112px_1fr] gap-2 text-[13px]">
              <dt className="text-zinc-500">{slug}</dt>
              <dd className="font-semibold text-zinc-900">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {secondaryContent ? (
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{secondaryContent}</p>
      ) : null}
      <PreviewCta label="Xem chi tiết" />
    </PreviewFrame>
  );
}
