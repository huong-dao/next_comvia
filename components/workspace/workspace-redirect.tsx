"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageLoading } from "@/components/app/page-state";
import { getAccessToken } from "@/lib/auth";
import { comviaFetch } from "@/lib/comviaFetch";
import { APP_PATHS, workspacePath } from "@/lib/paths";
import { getActiveWorkspaceId } from "@/lib/workspace-session";

type WorkspaceRow = { id: string; role?: string };

/**
 * Route không có workspace trong path (`/app/subscription`, `/app/wallet`) — đích của link trong email
 * BE (guide 9B.7). Chuyển tới trang tương ứng của workspace đang dùng; nếu workspace đó không còn
 * hợp lệ thì lấy workspace OWNER đầu tiên (chỉ owner nhận các email này), cuối cùng mới tới danh sách workspace.
 */
export function WorkspaceRedirect({ segment }: { segment: string }) {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    let active = true;
    void (async () => {
      let target: string = APP_PATHS.workspaces;
      try {
        const list = await comviaFetch<WorkspaceRow[]>("/workspaces", { token });
        const rows = Array.isArray(list) ? list : [];
        const stored = getActiveWorkspaceId();
        const pick =
          rows.find((w) => w.id === stored) ?? rows.find((w) => w.role === "OWNER") ?? rows[0] ?? null;
        if (pick) target = workspacePath(pick.id, segment);
      } catch {
        // Không lấy được danh sách (hết phiên, lỗi mạng): về danh sách workspace để người dùng tự chọn.
      }
      if (active) router.replace(target);
    })();

    return () => {
      active = false;
    };
  }, [router, segment]);

  return <PageLoading message="Đang chuyển hướng…" />;
}
