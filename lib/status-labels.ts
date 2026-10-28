/** Nhãn tiếng Việt của trạng thái thành viên workspace (WorkspaceMemberStatus). */
export const MEMBER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "ĐANG HOẠT ĐỘNG",
  DISABLED: "ĐÃ VÔ HIỆU HÓA",
};

/** Nhãn tiếng Việt của trạng thái chiến dịch (CampaignStatus). */
export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  DRAFT: "BẢN NHÁP",
  READY: "SẴN SÀNG",
  RUNNING: "ĐANG GỬI",
  PAUSED: "TẠM DỪNG",
  COMPLETED: "HOÀN THÀNH",
  FAILED: "THẤT BẠI",
  CANCELLED: "ĐÃ HỦY",
};

/** Nhãn tiếng Việt của trạng thái mẫu tin (TemplateStatus) hiển thị cho người dùng. */
export const TEMPLATE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "BẢN NHÁP",
  SUBMITTED: "ĐÃ GỬI",
  PENDING_ZALO_APPROVAL: "ĐANG CHỜ DUYỆT",
  APPROVED: "ĐÃ DUYỆT",
  REJECTED: "BỊ TỪ CHỐI",
  DISABLED: "ĐÃ KHÓA",
};
