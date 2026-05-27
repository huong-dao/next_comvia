/** Khớp `mismatches[].field` trong `docs/FRONTEND_ADMIN_ROUTER_API_MAP.mdc` (Issue PDF). */

const LABELS: Record<string, string> = {
  "billing.company_name": "Tên công ty",
  "billing.tax_code": "Mã số thuế",
  "billing.address": "Địa chỉ",
  "billing.invoice_email": "Email nhận hóa đơn",
  "billing.representative_name": "Người đại diện",
  "billing.phone": "Số điện thoại",
  "billing.full_name": "Họ và tên (cá nhân)",
  "billing.citizen_id": "CCCD / CMND",

  "commercial.vat_rate": "Thuế suất VAT",
  "commercial.amount_excl_vat": "Tiền trước VAT",
  "commercial.vat_amount": "Tiền VAT",
  "commercial.amount_incl_vat": "Tổng sau VAT",
  "commercial.line_item_name": "Tên dòng hàng",

  "identifiers.invoice_number": "Số hóa đơn",
  "identifiers.issue_date": "Ngày phát hành",
};

export function labelInvoiceMismatchField(field: string): string {
  return LABELS[field] ?? field;
}
