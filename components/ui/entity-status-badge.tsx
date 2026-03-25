import { StatusBadge } from "@/components/ui/status-badge";

const TONE_MAP: Record<string, "active" | "pending" | "error" | "neutral"> = {
  OWNER: "active",
  MEMBER: "neutral",
  USER: "neutral",
  ADMIN: "active",
  STAFF: "pending",
  ACTIVE: "active",
  APPROVED: "active",
  CONNECTED: "active",
  SUCCESS: "active",
  PAID: "active",
  ISSUED: "active",
  POSTED: "pending",
  PENDING: "pending",
  PENDING_VERIFICATION: "pending",
  PENDING_ZALO_APPROVAL: "pending",
  SUBMITTED: "pending",
  DRAFT: "neutral",
  READY: "neutral",
  DISABLED: "error",
  REJECTED: "error",
  FAILED: "error",
  DISCONNECTED: "error",
  CANCELLED: "error",
  UNKNOWN: "neutral",
  NOT_CONNECTED: "neutral",
};

export function EntityStatusBadge({ value }: { value: string }) {
  const tone = TONE_MAP[value] ?? "neutral";
  return <StatusBadge tone={tone}>{value.replace(/_/g, " ")}</StatusBadge>;
}
