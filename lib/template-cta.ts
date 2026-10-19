export type TemplateCtaType =
  | "OA_PROFILE"
  | "ZALO_MINI_APP"
  | "OA_ARTICLE"
  | "BUSINESS_WEBSITE"
  | "PHONE_CALL"
  | "EXTERNAL_WEB_OR_MINI_APP"
  | "APP_DOWNLOAD"
  | "DISTRIBUTION_PAGE"
  | "EXTERNAL_APP";

export type TemplateCtaButton = {
  id: string;
  type: TemplateCtaType;
  label: string | null;
  target: string | null;
  position: 0 | 1;
  unitPrice?: number | null;
};

export type TemplateCtaDraft = Omit<TemplateCtaButton, "id" | "label" | "target" | "unitPrice"> & {
  id?: string;
  label: string;
  target: string;
};

export const CTA_TYPE_OPTIONS: { value: TemplateCtaType; label: string }[] = [
  { value: "OA_PROFILE", label: "Đến trang thông tin OA" },
  { value: "ZALO_MINI_APP", label: "Đến Mini App của doanh nghiệp" },
  { value: "OA_ARTICLE", label: "Đến bài viết của OA" },
  { value: "BUSINESS_WEBSITE", label: "Đến trang của doanh nghiệp" },
  { value: "PHONE_CALL", label: "Gọi điện" },
  { value: "EXTERNAL_WEB_OR_MINI_APP", label: "Đến trang web/Mini App khác" },
  { value: "APP_DOWNLOAD", label: "Đến trang tải ứng dụng" },
  { value: "DISTRIBUTION_PAGE", label: "Đến trang phân phối sản phẩm" },
  { value: "EXTERNAL_APP", label: "Đến ứng dụng khác" },
];

export function newTemplateCta(position: 0 | 1): TemplateCtaDraft {
  return { type: "OA_PROFILE", label: "", target: "", position };
}

export function ctaTypeLabel(type: TemplateCtaType) {
  return CTA_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function ctaNeedsTarget(type: TemplateCtaType) {
  return type !== "OA_PROFILE";
}

function isValidVietnamPhone(value: string) {
  return /^(?:0\d{9}|84\d{9}|\+84\d{9})$/.test(value.replace(/[.\s-]/g, ""));
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeCtaButtons(buttons: TemplateCtaDraft[]) {
  return buttons.map((button, index) => ({
    ...(button.id ? { id: button.id } : {}),
    type: button.type,
    ...(button.label.trim() ? { label: button.label.trim() } : {}),
    ...(button.target.trim() ? { target: button.target.trim() } : {}),
    position: index as 0 | 1,
  }));
}

export function validateCtaButtons(buttons: TemplateCtaDraft[]): string | null {
  if (buttons.length > 2) return "Mẫu tin chỉ có tối đa 2 nút CTA.";

  for (const button of buttons) {
    const label = button.label.trim();
    const target = button.target.trim();
    if (label.length > 100) return "Nhãn nút CTA tối đa 100 ký tự.";
    if (ctaNeedsTarget(button.type) && !target) return `Vui lòng nhập đích đến cho “${ctaTypeLabel(button.type)}”.`;
    if (!target) continue;
    if (button.type === "PHONE_CALL") {
      if (!isValidVietnamPhone(target)) return "Số điện thoại CTA phải là số Việt Nam hợp lệ.";
    } else if (!isValidHttpUrl(target)) {
      return "Đích đến CTA phải là URL bắt đầu bằng http:// hoặc https://.";
    }
  }
  return null;
}
