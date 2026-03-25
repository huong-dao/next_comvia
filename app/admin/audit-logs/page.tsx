"use client";

import { useCallback, useState } from "react";
import { HiOutlineAdjustmentsHorizontal, HiOutlineClipboardDocumentList } from "react-icons/hi2";
import { PageHeader } from "@/components/app/page-header";
import { PageError, PageLoading } from "@/components/app/page-state";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { comviaFetch } from "@/lib/comviaFetch";
import { useComviaQuery } from "@/lib/use-comvia-query";

type LogRow = {
  id?: string;
  createdAt?: string;
  actorUserId?: string;
  workspaceId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: unknown;
};

export default function AdminAuditLogsPage() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [action, setAction] = useState("");
  const [limit, setLimit] = useState("50");

  const qs = new URLSearchParams();
  if (workspaceId) qs.set("workspaceId", workspaceId);
  if (action) qs.set("action", action);
  if (limit) qs.set("limit", limit);
  const q = qs.toString();

  const fetcher = useCallback(
    (token: string) => comviaFetch<LogRow[]>(`/admin/audit-logs${q ? `?${q}` : ""}`, { token }),
    [q],
  );

  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);
  const rows = data ?? [];

  return (
    <AdminRoleGate>
      {loading ? <PageLoading /> : null}
      {error && !data ? <PageError message={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div>
          <PageHeader title="Audit logs" description="Lọc audit log theo workspace, action và số lượng bản ghi cần tải." />
          <Card className="mb-6 space-y-4">
            <div className="flex items-center gap-2">
              <HiOutlineAdjustmentsHorizontal className="size-5 text-secondary" />
              <p className="text-sm font-semibold text-foreground">Bộ lọc audit log</p>
            </div>
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px_auto]">
              <Input className="max-w-xs" placeholder="workspaceId" value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} />
              <Input className="max-w-xs" placeholder="action" value={action} onChange={(e) => setAction(e.target.value)} />
              <Input value={limit} onChange={(e) => setLimit(e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} icon={<HiOutlineClipboardDocumentList className="size-4" />}>
                Áp dụng
              </Button>
            </div>
          </Card>
          <SimpleTable
            rows={rows}
            getRowKey={(r, i) => r.id ?? String(i)}
            columns={[
              {
                key: "t",
                header: "Thời gian",
                cell: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"),
              },
              { key: "a", header: "Actor", cell: (r) => r.actorUserId ?? "—" },
              { key: "w", header: "Workspace", cell: (r) => r.workspaceId ?? "—" },
              { key: "act", header: "Action", cell: (r) => r.action ?? "—" },
              { key: "rt", header: "Resource", cell: (r) => r.resourceType ?? "—" },
              { key: "rid", header: "Resource ID", cell: (r) => r.resourceId ?? "—" },
              {
                key: "m",
                header: "Meta",
                cell: (r) => (
                  <span className="line-clamp-2 font-mono text-xs">
                    {r.metadata != null ? JSON.stringify(r.metadata) : "—"}
                  </span>
                ),
              },
            ]}
          />
        </div>
      ) : null}
    </AdminRoleGate>
  );
}
