"use client";

import { orderedSlugs, previewTemplateContent } from "@/lib/template-placeholders";
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
  placeholderOrder?: string[] | null;
};

/** Preview mẫu tin "Dạng bảng" (hình 4): tiêu đề + đoạn mở + bảng key-value + nội dung phụ + CTA. */
export function TablePreview({ title, content, placeholders, placeholderLabels, secondaryContent, logoUrl, ctaButtons, placeholderOrder }: TablePreviewProps) {
  const rendered = previewTemplateContent(content, placeholders);
  // Chỉ hiện trong bảng những biến có nhập Nhãn — biến chỉ dùng trong content (không có nhãn) thì ẩn khỏi bảng.
  const rows = orderedSlugs(Object.keys(placeholders), placeholderOrder)
    .filter((slug) => Boolean(placeholderLabels?.[slug]))
    .map((slug) => [slug, placeholders[slug]] as const);

  return (
    <PreviewFrame logoUrl={logoUrl}>
      <PreviewTitle title={title} />
      {rendered ? (
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{rendered}</p>
      ) : null}
      {rows.length > 0 ? (
        <dl className="my-3 space-y-1.5">
          {rows.map(([slug, value]) => (
            <div key={slug} className="grid grid-cols-[112px_1fr] gap-2 text-[13px]">
              <dt className="text-zinc-500">{placeholderLabels?.[slug] || slug}</dt>
              <dd className="font-semibold text-zinc-900">{value || "—"}</dd>
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
