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
    if (typeof o.message === "string") return o.message;
    if (typeof o.error === "string") return o.error;
  }
  return "";
}

export function payloadToStringMap(payload?: Record<string, unknown> | null): Record<string, string> {
  if (!payload) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    out[k] = v == null ? "" : String(v);
  }
  return out;
}
