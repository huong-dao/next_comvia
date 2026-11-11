/**
 * Nhãn tiếng Việt cho mọi mã trạng thái/vai trò backend trả về.
 *
 * `EntityStatusBadge` tự tra bảng này nên call site không phải truyền `label`.
 * Giá trị enum KHÔNG đổi — chỉ đổi chữ hiển thị.
 */

/** Nhóm thực thể, dùng khi cùng một mã mang nghĩa khác nhau giữa các nghiệp vụ. */
export type StatusKind =
  | "template"
  | "campaign"
  | "campaignRow"
  | "member"
  | "apiKey"
  | "order"
  | "message"
  | "wallet"
  | "oa"
  | "workspace"
  | "user";

/** Nhãn mặc định — áp dụng khi không truyền `kind` hoặc `kind` không có override riêng. */
export const STATUS_LABELS: Record<string, string> = {
  // Vòng đời chung
  ACTIVE: "ĐANG HOẠT ĐỘNG",
  INACTIVE: "NGỪNG HOẠT ĐỘNG",
  DISABLED: "ĐÃ VÔ HIỆU HÓA",
  LOCKED: "ĐÃ KHÓA",
  REVOKED: "ĐÃ THU HỒI",
  EXPIRED: "ĐÃ HẾT HẠN",
  UNKNOWN: "KHÔNG XÁC ĐỊNH",

  // Duyệt mẫu tin
  DRAFT: "BẢN NHÁP",
  SUBMITTED: "ĐÃ GỬI",
  PENDING: "ĐANG CHỜ",
  PENDING_VERIFICATION: "CHỜ XÁC THỰC",
  PENDING_ZALO_APPROVAL: "ĐANG CHỜ DUYỆT",
  APPROVED: "ĐÃ DUYỆT",
  REJECTED: "BỊ TỪ CHỐI",

  // Chiến dịch & gửi tin
  READY: "SẴN SÀNG",
  RUNNING: "ĐANG GỬI",
  PAUSED: "TẠM DỪNG",
  COMPLETED: "HOÀN THÀNH",
  SUCCESS: "THÀNH CÔNG",
  FAILED: "THẤT BẠI",
  SKIPPED: "ĐÃ BỎ QUA",
  CANCELLED: "ĐÃ HỦY",

  // Thanh toán
  PAID: "ĐÃ THANH TOÁN",
  UNPAID: "CHƯA THANH TOÁN",
  ISSUED: "ĐÃ PHÁT HÀNH",
  POSTED: "ĐÃ GHI SỔ",

  // Kết nối Zalo OA
  CONNECTED: "ĐÃ KẾT NỐI",
  DISCONNECTED: "ĐÃ NGẮT KẾT NỐI",
  NOT_CONNECTED: "CHƯA KẾT NỐI",
  TOKEN_EXPIRED: "TOKEN HẾT HẠN",
  CONNECTION_ERROR: "LỖI KẾT NỐI",
  RECONNECT_REQUIRED: "CẦN KẾT NỐI LẠI",

  // Vai trò (hiển thị chung badge với trạng thái)
  OWNER: "CHỦ SỞ HỮU",
  MEMBER: "THÀNH VIÊN",
  ADMIN: "QUẢN TRỊ",
  STAFF: "NHÂN VIÊN",
  USER: "NGƯỜI DÙNG",
};

/**
 * Override theo nhóm. Chỉ khai những mã thực sự lệch nghĩa so với bảng mặc định,
 * ví dụ `DISABLED`: mẫu tin là "ĐÃ KHÓA", thành viên/workspace là "ĐÃ VÔ HIỆU HÓA".
 */
export const STATUS_LABELS_BY_KIND: Partial<Record<StatusKind, Record<string, string>>> = {
  template: {
    DISABLED: "ĐÃ KHÓA",
  },
  message: {
    PENDING: "ĐANG XỬ LÝ",
  },
  wallet: {
    PENDING: "ĐANG XỬ LÝ",
  },
  campaignRow: {
    PENDING: "CHƯA GỬI",
  },
};

/** Tra nhãn hiển thị; không có trong bảng thì trả mã gốc đã bỏ dấu gạch dưới. */
export function resolveStatusLabel(value: string, kind?: StatusKind): string {
  const key = value.trim().toUpperCase();
  const byKind = kind ? STATUS_LABELS_BY_KIND[kind]?.[key] : undefined;
  return byKind ?? STATUS_LABELS[key] ?? value.replace(/_/g, " ");
}

/** Nhãn trạng thái thành viên workspace (WorkspaceMemberStatus). */
export const MEMBER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: STATUS_LABELS.ACTIVE,
  DISABLED: STATUS_LABELS.DISABLED,
};

/** Nhãn trạng thái API key (ApiKeyStatus). */
export const API_KEY_STATUS_LABELS: Record<string, string> = {
  ACTIVE: STATUS_LABELS.ACTIVE,
  DISABLED: STATUS_LABELS.DISABLED,
  REVOKED: STATUS_LABELS.REVOKED,
};

/** Nhãn trạng thái chiến dịch (CampaignStatus). */
export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: STATUS_LABELS.DRAFT,
  READY: STATUS_LABELS.READY,
  RUNNING: STATUS_LABELS.RUNNING,
  PAUSED: STATUS_LABELS.PAUSED,
  COMPLETED: STATUS_LABELS.COMPLETED,
  FAILED: STATUS_LABELS.FAILED,
  CANCELLED: STATUS_LABELS.CANCELLED,
};

/** Nhãn trạng thái mẫu tin (TemplateStatus) hiển thị cho người dùng. */
export const TEMPLATE_STATUS_LABELS: Record<string, string> = {
  DRAFT: STATUS_LABELS.DRAFT,
  SUBMITTED: STATUS_LABELS.SUBMITTED,
  PENDING_ZALO_APPROVAL: STATUS_LABELS.PENDING_ZALO_APPROVAL,
  APPROVED: STATUS_LABELS.APPROVED,
  REJECTED: STATUS_LABELS.REJECTED,
  DISABLED: "ĐÃ KHÓA",
};
