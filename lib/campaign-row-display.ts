import { describeFailure, stripReconciliationPrefix } from "@/lib/message-failure";

export type CampaignDataRow = {
  id: string;
  phoneNumber?: string;
  payloadData?: Record<string, unknown> | null;
  status?: string;
  failureReason?: string;
  messageLog?: unknown;
};

export function campaignRowFailureText(row: CampaignDataRow): string {
  if (row.failureReason) return row.failureReason;
  const log = row.messageLog;
  if (log && typeof log === "object") {
    const o = log as Record<string, unknown>;
    if (typeof o.failureReason === "string") return o.failureReason;
    if (typeof o.errorCode === "string") return o.errorCode;
    if (typeof o.message === "string") return o.message;
    if (typeof o.error === "string") return o.error;
  }
  return "";
}

export type CampaignRowReason = {
  text: string;
  /** Chi tiết gốc từ BE, chỉ để tooltip. */
  detail: string | null;
  /** `danger` chỉ cho dòng FAILED; PENDING đang chờ KHÔNG phải lỗi. */
  tone: "danger" | "warning" | "muted";
};

/**
 * Lý do hiển thị cho một dòng campaign. Dòng `PENDING` của campaign PAUSED có `failureReason` là lý do
 * đang chờ (BE 2026-11-23), không phải lỗi → trung tính, không tô đỏ. Đếm dòng lỗi luôn theo `status`.
 */
export function campaignRowReason(row: CampaignDataRow): CampaignRowReason | null {
  const status = row.status?.toUpperCase();
  const raw = campaignRowFailureText(row);
  const failure = describeFailure(status === "RECONCILIATION_REQUIRED" ? stripReconciliationPrefix(raw) : raw);
  if (!failure) return null;
  if (status === "PENDING") {
    return { text: `Đang chờ: ${failure.label}`, detail: failure.detail, tone: "muted" };
  }
  if (status === "RECONCILIATION_REQUIRED") {
    return { text: `Cần đối soát: ${failure.label}`, detail: failure.detail, tone: "warning" };
  }
  return {
    text: failure.label,
    detail: failure.detail,
    tone: status === "FAILED" || !status ? "danger" : "muted",
  };
}

export function payloadToStringMap(payload?: Record<string, unknown> | null): Record<string, string> {
  if (!payload) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    out[k] = v == null ? "" : String(v);
  }
  return out;
}
