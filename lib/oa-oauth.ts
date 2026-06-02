/** OAuth Zalo OA — `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §6 */

export type OaConnectResponse = {
  authorizationUrl: string;
  state?: string;
  connectionId?: string;
};

export type OaOAuthCallbackResult = {
  status: "success" | "error";
  workspaceId: string | null;
  connected: boolean;
};

/** Query backend redirect sau `GET /oa/auth/callback`. */
export function parseOaOAuthCallback(searchParams: URLSearchParams): OaOAuthCallbackResult | null {
  const status = searchParams.get("status")?.toLowerCase();
  if (status !== "success" && status !== "error") return null;

  const workspaceId =
    searchParams.get("workspaceId") ??
    searchParams.get("workspace_id") ??
    searchParams.get("wsId") ??
    null;

  const connected =
    searchParams.get("connected") === "1" || status === "success";

  return {
    status,
    workspaceId: workspaceId?.trim() || null,
    connected,
  };
}

export function oaOAuthBannerMessage(result: OaOAuthCallbackResult): string {
  if (result.status === "success") {
    return "Đã kết nối Zalo Official Account thành công.";
  }
  const detail = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("message") : null;
  return detail?.trim()
    ? `Kết nối Zalo OA thất bại: ${detail}`
    : "Kết nối Zalo OA thất bại. Vui lòng thử lại.";
}

export const OA_PENDING_WORKSPACE_KEY = "comvia_oa_pending_workspace";

export function rememberOaOAuthWorkspace(workspaceId: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(OA_PENDING_WORKSPACE_KEY, workspaceId);
}

export function consumeOaOAuthWorkspace(): string | null {
  if (typeof window === "undefined") return null;
  const id = sessionStorage.getItem(OA_PENDING_WORKSPACE_KEY);
  sessionStorage.removeItem(OA_PENDING_WORKSPACE_KEY);
  return id?.trim() || null;
}

/** Query nội bộ FE sau khi chuyển từ trang callback. */
export type OaOAuthFlash = "success" | "error";

export function parseOaOAuthFlash(searchParams: URLSearchParams): OaOAuthFlash | null {
  const flash = searchParams.get("oa_oauth")?.toLowerCase();
  if (flash === "success" || flash === "error") return flash;
  const legacy = parseOaOAuthCallback(searchParams);
  return legacy?.status ?? null;
}
