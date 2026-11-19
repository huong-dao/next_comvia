/**
 * `providerTemplateId` (ID template ZNS trên Zalo, do STAFF/ADMIN nhập khi duyệt) chỉ hiển thị (read-only) ở màn xem chi tiết mẫu tin.
 * Danh sách/ô chọn vẫn dùng `code` nội bộ của Comvia.
 */
export const PROVIDER_TEMPLATE_ID_LABEL = "Mã template Zalo";

export function providerTemplateIdText(t: { providerTemplateId?: string | null }): string {
  return t.providerTemplateId?.trim() || "—";
}
