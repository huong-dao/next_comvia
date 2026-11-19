import { comviaFetch } from "@/lib/comviaFetch";

export type OaGuardResult = { ok: true; oaName?: string } | { ok: false; status: string; message: string };

const OA_MESSAGES: Record<string, string> = {
  NOT_CONNECTED: "Workspace chưa kết nối Zalo OA.",
  DISCONNECTED: "Zalo OA đã bị ngắt kết nối.",
  TOKEN_EXPIRED: "Phiên kết nối Zalo OA đã hết hạn.",
  RECONNECT_REQUIRED: "Zalo OA cần được kết nối lại.",
  CONNECTION_ERROR: "Kết nối Zalo OA đang gặp lỗi.",
  UNKNOWN: "Không kiểm tra được trạng thái Zalo OA.",
};

/** Thông báo tiếng Việt cho trạng thái OA không dùng được để gửi tin. */
export function oaBlockedMessage(status?: string): string {
  const key = (status ?? "").toUpperCase();
  const reason = OA_MESSAGES[key] ?? OA_MESSAGES.UNKNOWN;
  return `${reason} Vui lòng vào mục Zalo OA để kết nối lại trước khi gửi tin. Hệ thống chưa gửi tin và chưa trừ tiền.`;
}

/**
 * Gọi lại `GET /oa/status` ngay trước khi gửi/gửi lại. Chỉ `CONNECTED` mới được gửi;
 * lỗi mạng hoặc trạng thái lạ đều coi là không gửi được (an toàn hơn là trừ tiền rồi gửi hỏng).
 */
export async function ensureOaConnected(workspaceId: string, token: string): Promise<OaGuardResult> {
  try {
    const res = await comviaFetch<{ status?: string; oaName?: string }>(`/workspaces/${workspaceId}/oa/status`, {
      token,
    });
    const status = (res?.status ?? "UNKNOWN").toUpperCase();
    if (status === "CONNECTED") return { ok: true, oaName: res?.oaName };
    return { ok: false, status, message: oaBlockedMessage(status) };
  } catch {
    return { ok: false, status: "UNKNOWN", message: oaBlockedMessage("UNKNOWN") };
  }
}
