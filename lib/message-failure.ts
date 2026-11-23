/**
 * Lý do gửi tin thất bại (BE 2026-11-23): `errorCode` của MessageLog và `failureReason` của dòng campaign
 * có dạng `"<CODE>: <chi tiết>"`. Log cũ là chuỗi thô, không có mã.
 */

export type ParsedFailure = {
  /** `null` khi chuỗi không có tiền tố mã (log cũ) hoặc tiền tố không phải dạng mã. */
  code: string | null;
  detail: string;
};

/** Mã dạng IN_HOA_GACH_DƯỚI; tránh nhầm "Network error: x" thành mã. */
const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/** Tách theo dấu ": " ĐẦU TIÊN — phần chi tiết có thể chứa thêm dấu ":". */
export function parseFailure(raw?: string | null): ParsedFailure | null {
  const text = raw?.trim();
  if (!text) return null;
  const i = text.indexOf(": ");
  if (i > 0) {
    const code = text.slice(0, i);
    if (CODE_PATTERN.test(code)) return { code, detail: text.slice(i + 2) };
  }
  return { code: null, detail: text };
}

/** Câu tiếng Việt cho người dùng cuối, theo bảng `<CODE>` của BE. */
const FAILURE_LABELS: Record<string, string> = {
  TEMPLATE_NOT_APPROVED: "Mẫu tin chưa được duyệt",
  TEMPLATE_NOT_SYNCED: "Mẫu tin chưa đồng bộ với Zalo",
  OA_NOT_CONNECTED: "Official Account chưa kết nối với Zalo",
  OA_TOKEN_MISSING: "Thiếu token Official Account, cần kết nối lại",
  OA_TOKEN_EXPIRED: "Token Official Account đã hết hạn, cần kết nối lại",
  WORKSPACE_INACTIVE: "Workspace đang bị khóa",
  WALLET_NOT_INITIALIZED: "Ví chưa được khởi tạo",
  INSUFFICIENT_CREDIT: "Số dư không đủ để gửi tin",
  SUBSCRIPTION_REQUIRED: "Workspace chưa có gói dịch vụ",
  SUBSCRIPTION_EXPIRED: "Gói dịch vụ đã hết hạn",
  ZALO_REJECTED: "Zalo từ chối gửi tin",
  SEND_FAILED: "Gửi tin thất bại",
};

const GENERIC_FAILURE_LABEL = "Gửi tin thất bại";

export type FailureDisplay = {
  /** Câu hiển thị cho người dùng cuối. */
  label: string;
  /** Chi tiết gốc từ BE — chỉ để tra cứu (tooltip), không đưa thẳng vào nội dung chính. */
  detail: string | null;
  code: string | null;
};

/**
 * Với mã đã biết dùng câu tiếng Việt của FE. `ZALO_REJECTED`/`SEND_FAILED` có detail tiếng Anh/kỹ thuật
 * nên chỉ để ở `detail`. Mã lạ → "Gửi tin thất bại" kèm detail (guide 8.2).
 */
export function describeFailure(raw?: string | null): FailureDisplay | null {
  const parsed = parseFailure(raw);
  if (!parsed) return null;
  const known = parsed.code ? FAILURE_LABELS[parsed.code] : undefined;
  return {
    label: known ?? GENERIC_FAILURE_LABEL,
    detail: parsed.detail || null,
    code: parsed.code,
  };
}

/** Tiền tố BE thêm cho dòng campaign `RECONCILIATION_REQUIRED`. */
const RECONCILIATION_PREFIX = "Dispatch outcome requires reconciliation: ";

/** Bỏ tiền tố đối soát (nếu có) để phần còn lại parse được như `<CODE>: …`. */
export function stripReconciliationPrefix(raw?: string | null): string {
  const text = raw?.trim() ?? "";
  return text.startsWith(RECONCILIATION_PREFIX) ? text.slice(RECONCILIATION_PREFIX.length) : text;
}
