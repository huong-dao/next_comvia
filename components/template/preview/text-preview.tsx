"use client";

import { previewTemplateContent } from "@/lib/template-placeholders";
import { PreviewCtas, PreviewFrame, PreviewTitle } from "./preview-frame";
import type { TemplateCtaDraft } from "@/lib/template-cta";

type TextPreviewProps = {
  title: string;
  content: string;
  placeholders: Record<string, string>;
  logoUrl?: string | null;
  ctaButtons: TemplateCtaDraft[];
};

/** Preview mẫu tin "Dạng văn bản" (hình 5): tiêu đề + nội dung tự do (đã thay biến) + CTA. */
export function TextPreview({ title, content, placeholders, logoUrl, ctaButtons }: TextPreviewProps) {
  const rendered = previewTemplateContent(content, placeholders);

  return (
    <PreviewFrame logoUrl={logoUrl}>
      <PreviewTitle title={title} />
      <p className="mb-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{rendered || "—"}</p>
      <PreviewCtas buttons={ctaButtons} />
    </PreviewFrame>
  );
}
