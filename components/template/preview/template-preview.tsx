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
  secondaryContent: string;
  minutes: string;
  logoUrl?: string | null;
  ctaButtons?: TemplateCtaDraft[];
};

/** Chọn preview trực quan theo loại tin. Chỉ render phía client, không gửi gì thêm lên API. */
export function TemplatePreview({
  type,
  title,
  content,
  placeholders,
  placeholderLabels,
  secondaryContent,
  minutes,
  logoUrl,
  ctaButtons = [],
}: TemplatePreviewProps) {
  switch (type) {
    case "bang":
      return (
        <TablePreview
          title={title}
          content={content}
          placeholders={placeholders}
          placeholderLabels={placeholderLabels}
          secondaryContent={secondaryContent}
          logoUrl={logoUrl}
          ctaButtons={ctaButtons}
        />
      );
    case "van_ban":
      return <TextPreview title={title} content={content} placeholders={placeholders} logoUrl={logoUrl} ctaButtons={ctaButtons} />;
    case "otp":
      return <OtpPreview title={title} minutes={minutes} logoUrl={logoUrl} ctaButtons={ctaButtons} />;
  }
}
