"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { PageEmpty, PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { getAccessToken } from "@/lib/auth";
import { comviaFetch } from "@/lib/comviaFetch";
import { APP_PATHS, workspacePath } from "@/lib/paths";
import { useActiveWorkspace } from "@/lib/use-active-workspace";
import { useComviaQuery } from "@/lib/use-comvia-query";
import {
  getActiveWorkspaceId,
  notifyWorkspacesListChanged,
  setActiveWorkspace,
} from "@/lib/workspace-session";

type WorkspaceRow = {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  role?: string;
  joinedAt?: string;
};

export default function WorkspacesListPage() {
  const router = useRouter();
  const { activeWorkspaceId } = useActiveWorkspace();
  const autoEnteredRef = useRef(false);
  const fetcher = useCallback((token: string) => comviaFetch<WorkspaceRow[]>("/workspaces", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);

  const rows = data ?? [];

  const enterWorkspace = useCallback(
    async (workspace: WorkspaceRow) => {
      const token = getAccessToken();
      if (!token) {
        router.replace("/auth/login");
        return;
      }

      try {
        await comviaFetch(`/workspaces/${workspace.id}/switch`, { method: "POST", token });
      } catch {
        /* vẫn điều hướng local nếu switch lỗi */
      }

      setActiveWorkspace(workspace.id, workspace.name);
      notifyWorkspacesListChanged();
      router.push(workspacePath(workspace.id, "dashboard"));
    },
    [router],
  );

  useEffect(() => {
    if (!loading && !error && data && rows.length === 0) {
      router.replace(APP_PATHS.workspacesNew);
    }
  }, [loading, error, data, rows.length, router]);

  useEffect(() => {
    if (loading || error || rows.length !== 1 || autoEnteredRef.current) return;

    const storedActiveId = getActiveWorkspaceId();
    if (storedActiveId) return;

    autoEnteredRef.current = true;
    void enterWorkspace(rows[0]);
  }, [loading, error, rows, enterWorkspace]);

  if (loading) return <PageLoading />;
  if (error && !data) return <PageError message={error} onRetry={() => void refetch()} />;

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Workspace của bạn"
        description="Chọn workspace để làm việc hoặc tạo workspace mới."
        actions={
          <Button asChild>
            <Link href={APP_PATHS.workspacesNew}>Tạo workspace mới</Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <PageEmpty
          title="Chưa có workspace"
          description="Tạo workspace đầu tiên để bắt đầu dùng Comvia."
          action={
            <Button asChild>
              <Link href={APP_PATHS.workspacesNew}>Tạo workspace</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((ws) => {
            const isCurrentWorkspace = ws.id === activeWorkspaceId;

            return (
              <Card key={ws.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-foreground">{ws.name}</p>
                    {ws.slug ? <p className="text-xs text-muted-foreground">{ws.slug}</p> : null}
                  </div>
                  {ws.status ? <EntityStatusBadge value={ws.status} /> : null}
                </div>
                {ws.role ? (
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{ws.role}</p>
                ) : null}
                {ws.joinedAt ? (
                  <p className="text-xs text-muted-foreground">Tham gia: {new Date(ws.joinedAt).toLocaleString()}</p>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2">
                  {isCurrentWorkspace ? (
                    <Button size="sm" disabled>
                      Đang trong workspace
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void enterWorkspace(ws)}>
                      Vào workspace
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
