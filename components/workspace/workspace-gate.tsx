"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HiOutlineArrowLeftOnRectangle } from "react-icons/hi2";
import { PageForbidden, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { clearImpersonationSession, getImpersonationMeta, isImpersonating } from "@/lib/auth";
import { comviaFetch } from "@/lib/comviaFetch";
import { APP_PATHS } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";
import { setActiveWorkspace } from "@/lib/workspace-session";

type WorkspaceRow = {
  id: string;
  name: string;
  role?: string;
};

export type WorkspaceRoleValue = {
  workspaceId: string;
  role: string | null;
  refetchWorkspaces: () => Promise<void>;
};

const WorkspaceRoleContext = createContext<WorkspaceRoleValue | null>(null);

export function useWorkspaceContext() {
  const ctx = useContext(WorkspaceRoleContext);
  if (!ctx) {
    throw new Error("useWorkspaceContext must be used inside WorkspaceGate");
  }
  return ctx;
}

export function useOptionalWorkspaceContext() {
  return useContext(WorkspaceRoleContext);
}

export function isWorkspaceOwner(role: string | null | undefined) {
  return role === "OWNER";
}

/** Banner cố định báo đang ở phiên "đăng nhập hộ" (ISSUE-002) — token chỉ sống trong tab này. */
function ImpersonationBanner() {
  const router = useRouter();
  const meta = useMemo(() => getImpersonationMeta(), []);

  function exitImpersonation() {
    clearImpersonationSession();
    if (window.opener) {
      window.close();
      return;
    }
    router.replace("/auth/login");
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/60 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
      <p>
        Đang đăng nhập hộ <strong>{meta?.workspaceName ?? "workspace này"}</strong>
        {meta?.adminEmail ? <> — thực hiện bởi admin <strong>{meta.adminEmail}</strong></> : null}. Phiên tự hết hạn sau 20 phút kể từ lúc mở.
      </p>
      <Button type="button" size="sm" variant="outline" icon={<HiOutlineArrowLeftOnRectangle className="size-4" />} onClick={exitImpersonation}>
        Thoát chế độ đăng nhập hộ
      </Button>
    </div>
  );
}

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const impersonating = isImpersonating();

  const fetcher = useCallback(
    (token: string) => comviaFetch<WorkspaceRow[]>("/workspaces", { token }),
    [],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const member = useMemo(
    () => data?.find((w) => w.id === workspaceId) ?? null,
    [data, workspaceId],
  );

  useEffect(() => {
    if (!member) return;
    setActiveWorkspace(member.id, member.name);
  }, [member]);

  if (!workspaceId) {
    return <PageForbidden message="Thiếu workspace." backHref={APP_PATHS.workspaces} />;
  }

  if (loading) {
    return <PageLoading />;
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-foreground">{error}</p>
        <Link
          href={APP_PATHS.workspaces}
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Về danh sách workspace
        </Link>
      </div>
    );
  }

  if (data && !member) {
    return (
      <PageForbidden
        message="Bạn không thuộc workspace này hoặc workspace không tồn tại."
        backHref={APP_PATHS.workspaces}
      />
    );
  }

  const value: WorkspaceRoleValue = {
    workspaceId,
    role: member?.role ?? null,
    refetchWorkspaces: refetch,
  };

  return (
    <WorkspaceRoleContext.Provider value={value}>
      {impersonating ? <ImpersonationBanner /> : null}
      {children}
    </WorkspaceRoleContext.Provider>
  );
}
