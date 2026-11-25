import { useEffect, useState } from "react";
import { getStoredUser } from "@/lib/auth";
import type { TemplateMessageType } from "@/components/template/preview/template-preview";
import { newTemplateCta, type TemplateCtaDraft, type TemplateCtaType } from "@/lib/template-cta";
import { newPlaceholderRow, recordToPlaceholderRows, type PlaceholderRow } from "@/lib/template-placeholders";

/** Loại tin phía backend (TPLLIB-01). */
export type LibraryItemType = "TEXT" | "TABLE" | "OTP";

export type LibraryCategory = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder: number;
  itemCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type LibraryCta = {
  type: TemplateCtaType;
  label?: string | null;
  target?: string | null;
  position: 0 | 1;
};

export type LibraryItem = {
  id: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  name: string;
  description: string | null;
  type: LibraryItemType;
  title: string | null;
  content: string | null;
  secondaryContent: string | null;
  content2: string | null;
  secondaryContent2: string | null;
  otpExpiryMinutes: number | null;
  placeholdersJson: Record<string, string> | null;
  placeholder_labels: Record<string, string> | null;
  placeholderOrder: string[] | null;
  ctaButtons: LibraryCta[] | null;
  createdAt?: string;
  updatedAt?: string;
};

export type LibraryListMeta = { page: number; limit: number; total: number; totalPages: number };
export type LibraryList<T> = { data: T[]; meta: LibraryListMeta };

export const LIBRARY_TYPE_LABELS: Record<LibraryItemType, string> = {
  TEXT: "Dạng văn bản",
  TABLE: "Dạng bảng",
  OTP: "Dạng OTP",
};

export const USER_LIBRARY_API = "/template-library";
export const ADMIN_LIBRARY_API = "/admin/template-library";

const TYPE_TO_PREVIEW: Record<LibraryItemType, TemplateMessageType> = {
  TABLE: "bang",
  TEXT: "van_ban",
  OTP: "otp",
};

const PREVIEW_TO_TYPE: Record<TemplateMessageType, LibraryItemType> = {
  bang: "TABLE",
  van_ban: "TEXT",
  otp: "OTP",
};

export function libraryTypeToPreview(type: string | undefined | null): TemplateMessageType {
  return TYPE_TO_PREVIEW[(type ?? "TEXT").toUpperCase() as LibraryItemType] ?? "van_ban";
}

export function previewToLibraryType(type: TemplateMessageType): LibraryItemType {
  return PREVIEW_TO_TYPE[type];
}

/** CTA của thư viện → draft của form (bỏ `id`/`unitPrice`, null → chuỗi rỗng). */
export function libraryCtaToDrafts(buttons: LibraryCta[] | null | undefined): TemplateCtaDraft[] {
  return [...(buttons ?? [])]
    .sort((a, b) => a.position - b.position)
    .slice(0, 2)
    .map((button, index) => ({
      ...newTemplateCta(index as 0 | 1),
      type: button.type,
      label: button.label ?? "",
      target: button.target ?? "",
    }));
}

export function buildLibraryQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/**
 * Role của người dùng đang đăng nhập (ADMIN/USER/STAFF). Đọc sau khi mount để tránh lệch hydration;
 * `null` = chưa biết (đang mount).
 */
export function useStoredRole(): string | null {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRole(String(getStoredUser()?.role ?? "").toUpperCase());
  }, []);
  return role;
}

export type LibraryFormValues = {
  name: string;
  type: TemplateMessageType;
  title: string;
  content: string;
  content2: string;
  secondaryContent: string;
  secondaryContent2: string;
  otpMinutes: string;
  placeholderRows: PlaceholderRow[];
  ctaButtons: TemplateCtaDraft[];
};

/**
 * Quy tắc fill form tạo/sửa mẫu tin từ mẫu thư viện (spec mục 5): ghi đè toàn bộ, `null` → để trống.
 * Không đụng tới OA, `code`, `trackingId`; CTA không mang `id`/`unitPrice`.
 */
export function libraryItemToFormValues(item: LibraryItem): LibraryFormValues {
  const isOtp = item.type === "OTP";
  return {
    name: item.name ?? "",
    type: libraryTypeToPreview(item.type),
    title: item.title ?? "",
    content: isOtp ? "" : (item.content ?? ""),
    content2: isOtp ? "" : (item.content2 ?? ""),
    secondaryContent: isOtp ? "" : (item.secondaryContent ?? ""),
    secondaryContent2: isOtp ? "" : (item.secondaryContent2 ?? ""),
    otpMinutes: String(item.otpExpiryMinutes ?? 5),
    placeholderRows: isOtp
      ? [newPlaceholderRow()]
      : recordToPlaceholderRows(item.placeholdersJson, item.placeholder_labels, item.placeholderOrder),
    ctaButtons: isOtp ? [] : libraryCtaToDrafts(item.ctaButtons),
  };
}
