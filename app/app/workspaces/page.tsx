"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { PageEmpty, PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/ui/entity-status-badge";
import { comviaFetch } from "@/lib/comviaFetch";
import { APP_PATHS, workspacePath } from "@/lib/paths";
import { useComviaQuery } from "@/lib/use-comvia-query";

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
  const fetcher = useCallback((token: string) => comviaFetch<WorkspaceRow[]>("/workspaces", { token }), []);
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);

  const rows = data ?? [];

  useEffect(() => {
    if (!loading && !error && data && rows.length === 0) {
      router.replace(APP_PATHS.workspacesNew);
    }
  }, [loading, error, data, rows.length, router]);

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
          {rows.map((ws) => (
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
                <Button asChild size="sm">
                  <Link href={workspacePath(ws.id, "dashboard")}>Vào workspace</Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
