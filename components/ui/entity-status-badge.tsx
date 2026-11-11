import { StatusBadge } from "@/components/ui/status-badge";
import { resolveStatusLabel, type StatusKind } from "@/lib/status-labels";

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
  READY: "active",
  RUNNING: "pending",
  COMPLETED: "active",
  SKIPPED: "neutral",
  DISABLED: "error",
  REJECTED: "error",
  FAILED: "error",
  DISCONNECTED: "error",
  CANCELLED: "error",
  UNKNOWN: "neutral",
  NOT_CONNECTED: "neutral",
  TOKEN_EXPIRED: "error",
  CONNECTION_ERROR: "error",
  RECONNECT_REQUIRED: "pending",
};

/**
 * Badge trạng thái. Chữ hiển thị mặc định lấy bản dịch tiếng Việt theo `value`
 * (xem `lib/status-labels.ts`); màu luôn theo `value` gốc.
 *
 * - `kind`: chọn bản dịch riêng khi cùng mã khác nghĩa (vd `DISABLED` của mẫu tin).
 * - `label`: ghi đè thủ công, thắng mọi tra cứu — dùng cho nhãn không suy ra được từ enum.
 */
export function EntityStatusBadge({
  value,
  label,
  kind,
}: {
  value: string;
  label?: string;
  kind?: StatusKind;
}) {
  const tone = TONE_MAP[value.trim().toUpperCase()] ?? "neutral";
  return <StatusBadge tone={tone}>{label ?? resolveStatusLabel(value, kind)}</StatusBadge>;
}
