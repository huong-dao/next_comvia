"use client";

import { previewTemplateContent } from "@/lib/template-placeholders";
import { PreviewCta, PreviewFrame } from "./preview-frame";

type TextPreviewProps = {
  title: string;
  content: string;
  placeholders: Record<string, string>;
};

/** Preview mẫu tin "Dạng văn bản" (hình 5): tiêu đề + nội dung tự do (đã thay biến) + CTA. */
export function TextPreview({ title, content, placeholders }: TextPreviewProps) {
  const rendered = previewTemplateContent(content, placeholders);

  return (
    <PreviewFrame>
      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{rendered || "—"}</p>
      <PreviewCta label="Quan tâm OA" />
    </PreviewFrame>
  );
}
