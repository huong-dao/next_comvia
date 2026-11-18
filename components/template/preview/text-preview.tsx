"use client";

import { previewTemplateContent } from "@/lib/template-placeholders";
import { PreviewCtas, PreviewFrame, PreviewTitle } from "./preview-frame";
import type { TemplateCtaDraft } from "@/lib/template-cta";

type TextPreviewProps = {
  title: string;
  content: string;
  placeholders: Record<string, string>;
  content2?: string;
  secondaryContent?: string;
  secondaryContent2?: string;
  logoUrl?: string | null;
  ctaButtons: TemplateCtaDraft[];
};

/** Preview mẫu tin "Dạng văn bản" (hình 5): tiêu đề + nội dung tự do (đã thay biến) + CTA. */
export function TextPreview({ title, content, placeholders, content2, secondaryContent, secondaryContent2, logoUrl, ctaButtons }: TextPreviewProps) {
  const rendered = previewTemplateContent(content, placeholders);
  const rendered2 = previewTemplateContent(content2 ?? "", placeholders);

  return (
    <PreviewFrame logoUrl={logoUrl}>
      <PreviewTitle title={title} />
      <p className="mb-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{rendered || "—"}</p>
      {rendered2 ? <p className="mb-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{rendered2}</p> : null}
      {secondaryContent ? <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{secondaryContent}</p> : null}
      {secondaryContent2 ? <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-600">{secondaryContent2}</p> : null}
      <PreviewCtas buttons={ctaButtons} />
    </PreviewFrame>
  );
}
