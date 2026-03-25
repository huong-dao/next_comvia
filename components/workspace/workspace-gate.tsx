"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageForbidden, PageLoading } from "@/components/app/page-state";
import { comviaFetch } from "@/lib/comviaFetch";
import { APP_PATHS } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";

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

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const fetcher = useCallback(
    (token: string) => comviaFetch<WorkspaceRow[]>("/workspaces", { token }),
    [],
  );

  const { data, loading, error, refetch } = useComviaQuery(Boolean(workspaceId), fetcher);

  const member = useMemo(
    () => data?.find((w) => w.id === workspaceId) ?? null,
    [data, workspaceId],
  );

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

  return <WorkspaceRoleContext.Provider value={value}>{children}</WorkspaceRoleContext.Provider>;
}
