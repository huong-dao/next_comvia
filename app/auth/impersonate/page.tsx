"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveImpersonationSession, type ImpersonationMeta, type StoredUser } from "@/lib/auth";
import { workspacePath } from "@/lib/paths";

/**
 * Nhận phiên "đăng nhập hộ Owner" (ISSUE-002) qua `postMessage` từ tab admin
 * đã mở tab này bằng `window.open()` — KHÔNG qua query string, vì access
 * token là dữ liệu nhạy cảm không được đặt trên URL (có thể lưu lại trong
 * lịch sử trình duyệt). Token chỉ lưu vào sessionStorage của chính tab này.
 */
type ImpersonateTokenMessage = {
  type: "comvia:impersonate-token";
  accessToken: string;
  user: StoredUser;
  meta: ImpersonationMeta;
};
type ImpersonateErrorMessage = { type: "comvia:impersonate-error"; message: string };

const NO_OPENER_MESSAGE = "Trang này chỉ hoạt động khi được mở từ nút \"Đăng nhập Owner\" ở trang quản trị.";

export default function ImpersonateReceiverPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(() =>
    typeof window !== "undefined" && !window.opener ? NO_OPENER_MESSAGE : null,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.opener) return;

    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== window.opener) return;
      const data = event.data as ImpersonateTokenMessage | ImpersonateErrorMessage | undefined;
      if (!data || typeof data.type !== "string") return;

      if (data.type === "comvia:impersonate-error") {
        setError(data.message);
        return;
      }
      if (data.type === "comvia:impersonate-token") {
        saveImpersonationSession({ accessToken: data.accessToken, user: data.user, meta: data.meta });
        router.replace(workspacePath(data.meta.workspaceId, "dashboard"));
      }
    }

    window.addEventListener("message", handleMessage);
    window.opener.postMessage({ type: "comvia:impersonate-ready" }, window.location.origin);

    const timeout = window.setTimeout(() => {
      setError((current) => current ?? "Không nhận được phiên đăng nhập. Vui lòng đóng tab này và thử lại.");
    }, 15000);

    return () => {
      window.removeEventListener("message", handleMessage);
      window.clearTimeout(timeout);
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="max-w-sm text-center">
        {error ? (
          <>
            <p className="text-sm font-semibold text-danger">Không thể đăng nhập hộ</p>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-foreground">Đang chuyển vào workspace…</p>
            <p className="mt-2 text-sm text-muted-foreground">Vui lòng đợi trong giây lát.</p>
          </>
        )}
      </div>
    </div>
  );
}
