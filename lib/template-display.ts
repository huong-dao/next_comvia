/**
 * Mã hiển thị cho user là `providerTemplateId` (ID template ZNS trên Zalo, do STAFF/ADMIN nhập khi duyệt).
 * Không hiển thị `code` nội bộ do Comvia sinh để tránh user nhầm là mã của Zalo.
 */
export const PROVIDER_TEMPLATE_ID_LABEL = "Mã template Zalo";

export function providerTemplateIdText(t: { providerTemplateId?: string | null }): string {
  return t.providerTemplateId?.trim() || "—";
}

/** Nhãn cho ô chọn mẫu tin: `Tên (mã Zalo)`; chưa có mã Zalo thì chỉ hiện tên. */
export function templateOptionLabel(t: { id: string; name?: string; providerTemplateId?: string | null }): string {
  const pid = t.providerTemplateId?.trim();
  const name = t.name?.trim();
  if (name) return pid ? `${name} (${pid})` : name;
  return pid || t.id;
}
