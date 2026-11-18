"use client";

import { OtpPreview } from "./otp-preview";
import { TablePreview } from "./table-preview";
import { TextPreview } from "./text-preview";
import type { TemplateCtaDraft } from "@/lib/template-cta";

/** Loại tin — thuần nội bộ Comvia, chỉ đổi field form + preview, KHÔNG map loại ZNS Zalo (ISSUE-004). */
export type TemplateMessageType = "bang" | "van_ban" | "otp";

type TemplatePreviewProps = {
  type: TemplateMessageType;
  title: string;
  content: string;
  placeholders: Record<string, string>;
  placeholderLabels?: Record<string, string>;
  content2?: string;
  secondaryContent: string;
  secondaryContent2?: string;
  minutes: string;
  logoUrl?: string | null;
  ctaButtons?: TemplateCtaDraft[];
  /** Thứ tự biến đã lưu ở DB (placeholderOrder); null/thiếu → thứ tự khóa của placeholders. */
  placeholderOrder?: string[] | null;
};

/** Chọn preview trực quan theo loại tin. Chỉ render phía client, không gửi gì thêm lên API. */
export function TemplatePreview({
  type,
  title,
  content,
  placeholders,
  placeholderLabels,
  content2,
  secondaryContent,
  secondaryContent2,
  minutes,
  logoUrl,
  ctaButtons = [],
  placeholderOrder,
}: TemplatePreviewProps) {
  // Chuẩn hóa nhãn chung cho mọi nơi xem trước: bỏ nhãn rỗng, KHÔNG fallback về slug.
  const labels = Object.fromEntries(
    Object.entries(placeholderLabels ?? {})
      .map(([slug, label]) => [slug, (label ?? "").trim()] as const)
      .filter(([, label]) => label),
  );
  switch (type) {
    case "bang":
      return (
        <TablePreview
          title={title}
          content={content}
          placeholders={placeholders}
          placeholderLabels={labels}
          content2={content2}
          secondaryContent={secondaryContent}
          secondaryContent2={secondaryContent2}
          logoUrl={logoUrl}
          ctaButtons={ctaButtons}
          placeholderOrder={placeholderOrder}
        />
      );
    case "van_ban":
      return <TextPreview title={title} content={content} placeholders={placeholders} content2={content2} secondaryContent={secondaryContent} secondaryContent2={secondaryContent2} logoUrl={logoUrl} ctaButtons={ctaButtons} />;
    case "otp":
      return <OtpPreview title={title} minutes={minutes} secondaryContent={secondaryContent} secondaryContent2={secondaryContent2} logoUrl={logoUrl} ctaButtons={ctaButtons} />;
  }
}
